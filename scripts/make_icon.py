"""Developer utility to render the original Jeffy mark. Requires Pillow."""
from pathlib import Path
from PIL import Image, ImageDraw

base = Path(__file__).resolve().parent.parent / 'public'
size = 1024
image = Image.new('RGBA', (size, size))
d = ImageDraw.Draw(image)
scale = size / 64
def xy(values):
    return tuple(round(v * scale) for v in values)
d.rounded_rectangle((0, 0, size-1, size-1), radius=round(18*scale), fill='#122742')
d.line(xy((21, 20, 43, 20)), fill='#9bcfff', width=round(5*scale))
d.line(xy((35, 20, 35, 40)), fill='#9bcfff', width=round(5*scale))
d.arc(xy((19, 32, 35, 49)), 0, 175, fill='#9bcfff', width=round(5*scale))
for x, y1, y2 in [(47,29,36),(53,25,40)]:
    d.line(xy((x,y1,x,y2)), fill='#569feb', width=round(3*scale))
image.resize((256,256),Image.Resampling.LANCZOS).save(base/'logo.png')
image.save(base/'logo.ico',format='ICO',sizes=[(16,16),(24,24),(32,32),(48,48),(64,64),(128,128),(256,256)])
