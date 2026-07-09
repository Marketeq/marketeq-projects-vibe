from PIL import Image, UnidentifiedImageError
import sys

def is_static_image(path):
    try:
        img = Image.open(path)
        if getattr(img, "is_animated", False):
            print("False")  # Animated
        else:
            print("True")   # Static
    except UnidentifiedImageError:
        print("False")

if __name__ == "__main__":
    is_static_image(sys.argv[1])
