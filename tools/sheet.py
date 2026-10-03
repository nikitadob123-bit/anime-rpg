import sys,glob
from PIL import Image
files=sys.argv[2:]
cols=int(sys.argv[1]); w,h=170,213
rows=(len(files)+cols-1)//cols
sh=Image.new('RGB',(cols*w,rows*h))
for i,f in enumerate(files):
    im=Image.open(f).resize((w,h)); sh.paste(im,((i%cols)*w,(i//cols)*h))
sh.save('/workspace/anime-rpg/.tmp/'+sys.argv[1]+'_'+str(len(files))+'_'+files[0].split('/')[-1]+'.png')
