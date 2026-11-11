"""Conservative application limits, not universal model memory estimates.

Reading hardware never imports torch or loads a model. Unknown capacity blocks
inference, but does not prevent planning, copying prompts or ordinary Audio Fix.
"""
import os
import subprocess

PROFILES = {
    'low': dict(seconds=4, count=1, preview_width=384, ram_mib=4096, vram_mib=7168),
    'balanced': dict(seconds=8, count=2, preview_width=512, ram_mib=6144, vram_mib=7168),
    'full': dict(seconds=12, count=3, preview_width=640, ram_mib=8192, vram_mib=8192),
}

def snapshot():
    result = dict(ram_free_mib=None, ram_total_mib=None, gpus=[], known=False)
    try:
        import psutil
        memory = psutil.virtual_memory()
        result.update(ram_free_mib=memory.available // 1024**2, ram_total_mib=memory.total // 1024**2)
    except (ImportError, OSError):
        if os.name == 'nt':
            import ctypes
            class Memory(ctypes.Structure):
                _fields_ = [('length', ctypes.c_ulong), ('load', ctypes.c_ulong)] + [(k, ctypes.c_ulonglong) for k in ('total','available','page','page_available','virtual','virtual_available','extended')]
            memory = Memory(); memory.length = ctypes.sizeof(memory)
            if ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(memory)):
                result.update(ram_free_mib=memory.available // 1024**2, ram_total_mib=memory.total // 1024**2)
    try:
        command = ['nvidia-smi', '--query-gpu=index,memory.total,memory.free,utilization.gpu', '--format=csv,noheader,nounits']
        response = subprocess.run(command, capture_output=True, text=True, timeout=4, creationflags=0x08000000 if os.name == 'nt' else 0)
        if response.returncode == 0:
            for row in response.stdout.strip().splitlines():
                index, total, free, usage = map(int, row.split(','))
                result['gpus'].append(dict(index=index, total_mib=total, free_mib=free, usage=usage))
    except (OSError, ValueError, subprocess.TimeoutExpired):
        pass
    result['known'] = result['ram_free_mib'] is not None and bool(result['gpus'])
    # A remapped CUDA device cannot be matched safely to physical GPU 0 here.
    # Do not inspect one GPU and accidentally launch on another one.
    if os.environ.get('CUDA_VISIBLE_DEVICES', '').strip() not in ('', '0'):
        result['gpus'] = []; result['known'] = False
    return result

def resolve(profile, hardware):
    if profile not in ('auto', *PROFILES):
        raise ValueError('Unknown resource profile.')
    # The current isolated worker uses CUDA device 0. Do not select a different
    # adapter merely because it has more free memory.
    gpu = next((g for g in hardware.get('gpus', []) if g['index'] == 0), None)
    if profile != 'auto':
        return profile
    ram = hardware.get('ram_free_mib') or 0
    if gpu and gpu['free_mib'] >= 10240 and ram >= 12288:
        return 'full'
    if gpu and gpu['free_mib'] >= 8192 and ram >= 8192:
        return 'balanced'
    return 'low'

def assess(profile='auto', hardware=None):
    hardware = snapshot() if hardware is None else hardware
    chosen = resolve(profile, hardware); limits = PROFILES[chosen]
    gpu = next((g for g in hardware.get('gpus', []) if g['index'] == 0), None)
    reasons = []
    if hardware.get('ram_free_mib') is None: reasons.append('unknown_ram')
    elif hardware['ram_free_mib'] < limits['ram_mib']: reasons.append('ram')
    if gpu is None: reasons.append('unknown_gpu')
    else:
        if gpu['free_mib'] < limits['vram_mib']: reasons.append('vram')
        if gpu['usage'] >= 35: reasons.append('busy')
    return dict(selected=profile, effective=chosen, limits=limits, hardware=hardware, allowed=not reasons, reasons=reasons)

def enforce(profile='auto', *, seconds=None, count=None, hardware=None):
    result = assess(profile, hardware)
    limits = result['limits']
    if seconds is not None and seconds > limits['seconds'] + 1e-6:
        raise ValueError(f"Resource profile {result['effective']}: maximum {limits['seconds']} seconds. Select a shorter interval or another profile.")
    if count is not None and count > limits['count']:
        raise ValueError(f"Resource profile {result['effective']}: maximum {limits['count']} alternatives.")
    if not result['allowed']:
        raise RuntimeError('Resource check blocked generation: ' + ', '.join(result['reasons']) + f". Required free RAM / VRAM: {limits['ram_mib']} / {limits['vram_mib']} MiB. Finish other generation or choose a lighter profile. Unknown hardware must be checked before inference.")
    return result
