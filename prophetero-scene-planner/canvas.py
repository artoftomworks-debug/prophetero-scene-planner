"""Shared export geometry rules: native H3 I2V uses these dimensions directly."""
PRESETS={
    'landscape':(1344,768),'portrait':(768,1344),'square':(768,768),
    'trial-landscape':(768,448),'trial-portrait':(448,768),'square-512':(512,512),
    '1024-landscape':(1024,576),'1024-portrait':(576,1024),
    '1088-landscape':(1088,608),'1088-portrait':(608,1088),
    '1280-landscape':(1280,704),'1280-portrait':(704,1280),'square-1024':(1024,1024),
    'fullhd-landscape':(1920,1088),'fullhd-portrait':(1088,1920),
}
def dimensions(width,height):
    if type(width) is not int or type(height) is not int or not (256<=width<=4096 and 256<=height<=4096):
        raise ValueError('Width and height must be whole numbers between 256 and 4096.')
    if width%32 or height%32: raise ValueError('H3 width and height must be multiples of 32 (e.g. 1088 x 608 or 1920 x 1088).')
    if width*height>8_388_608: raise ValueError('Canvas limit: 8 megapixels. Use a smaller generation size and upscale separately.')
    return width,height
def canvas_size(plan):
    preset=plan.get('preset')
    if preset=='custom':return dimensions(plan.get('customWidth'),plan.get('customHeight'))
    if preset not in PRESETS:raise ValueError('Choose a supported canvas or custom dimensions.')
    return PRESETS[preset]
