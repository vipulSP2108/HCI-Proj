import os
from PIL import Image, ImageDraw, ImageFilter

brain_dir = "/Users/aai/.gemini/antigravity/brain/e2b3d883-6900-4600-bf75-d7a074b37758"
user_img_path = os.path.join(brain_dir, "kinexa_user_node_1780556017018.png")
ai_img_path = os.path.join(brain_dir, "kinexa_ai_node_1780556030914.png")
grid_img_path = os.path.join(brain_dir, "Combined_System_Overview.png")

user_img = Image.open(user_img_path).convert("RGBA")
ai_img = Image.open(ai_img_path).convert("RGBA")
grid_img = Image.open(grid_img_path).convert("RGBA")

node_size = 1200
user_img = user_img.resize((node_size, node_size), Image.Resampling.LANCZOS)
ai_img = ai_img.resize((node_size, node_size), Image.Resampling.LANCZOS)

def make_transparent(img):
    datas = img.getdata()
    new_data = []
    for item in datas:
        # if white or close to white, make transparent
        if item[0] > 240 and item[1] > 240 and item[2] > 240:
            new_data.append((255, 255, 255, 0))
        else:
            new_data.append(item)
    img.putdata(new_data)
    return img

user_img = make_transparent(user_img)
ai_img = make_transparent(ai_img)

padding_x = 200
total_w = node_size + padding_x + node_size + padding_x + grid_img.width + padding_x
total_h = grid_img.height

bg_color = (241, 245, 249, 255) # Slate 100 with alpha
canvas = Image.new("RGBA", (total_w, total_h), bg_color)

grid_x = total_w - grid_img.width - padding_x//2
grid_y = 0
canvas.paste(grid_img, (grid_x, grid_y), grid_img)

user_x = padding_x//2
user_y = (total_h - node_size) // 2
canvas.paste(user_img, (user_x, user_y), user_img)

ai_x = user_x + node_size + padding_x
ai_y = (total_h - node_size) // 2
canvas.paste(ai_img, (ai_x, ai_y), ai_img)

draw = ImageDraw.Draw(canvas)
arrow_color = (100, 116, 139, 255)
line_width = 20

def draw_arrow(x1, y1, x2, y2):
    draw.line((x1, y1, x2, y2), fill=arrow_color, width=line_width)
    arrow_size = 50
    points = [
        (x2, y2),
        (x2 - arrow_size, y2 - arrow_size),
        (x2 - arrow_size, y2 + arrow_size)
    ]
    draw.polygon(points, fill=arrow_color)

a1_start = (user_x + node_size - 100, total_h // 2)
a1_end = (ai_x + 100, total_h // 2)
draw_arrow(a1_start[0], a1_start[1], a1_end[0], a1_end[1])

a2_start = (ai_x + node_size - 100, total_h // 2)
a2_end = (grid_x + 50, total_h // 2)
draw_arrow(a2_start[0], a2_start[1], a2_end[0], a2_end[1])

final_canvas = Image.new("RGB", canvas.size, (255,255,255))
final_canvas.paste(canvas, mask=canvas.split()[3])

output_path = os.path.join(brain_dir, "Final_Kinexa_Teaser.png")
final_canvas.save(output_path)
print(f"Saved {output_path}")
