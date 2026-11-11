"""Keep sound planning separate from inference and preserve original projects."""
import re

def direction(value):
    if value is None: return {}
    if not isinstance(value, dict): raise ValueError('Invalid audio direction.')
    result={}
    for key, allowed, default in (
        ('category',('unchanged','scene','ambience','effect','music','silent'),'unchanged'),
        ('environment',('automatic','outdoors','room','cafe','street','nature','arena'),'automatic'),
        ('speech',('none','dialogue','voiceover'),'none'),
        ('mood',('natural','calm','tense','dramatic','energetic'),'natural')):
        v=value.get(key,default)
        if v not in allowed: raise ValueError('Invalid audio direction: '+key)
        result[key]=v
    for key, maximum in (('custom',1000),('instruction',4000)):
        v=value.get(key,'')
        if not isinstance(v,str) or len(v)>maximum: raise ValueError('Audio text is too long.')
        result[key]=v
    for key, default in (('noMusic',True),('lipSync',False)):
        v=value.get(key,default)
        if type(v) is not bool: raise ValueError('Invalid audio switch.')
        result[key]=v
    # This is a planning field only; no installed sync engine is claimed.
    result['lipSync']=False
    return result

def compose(prompt, audio):
    if not audio: return prompt
    prompt=re.sub(r'\n*\[SCENE AUDIO\][\s\S]*?\[/SCENE AUDIO\]','',prompt).strip()
    if audio['category']!='unchanged' and audio['instruction'].strip():
        prompt+='\n\n[SCENE AUDIO]\n'+audio['instruction'].strip()+'\n[/SCENE AUDIO]'
    return prompt
