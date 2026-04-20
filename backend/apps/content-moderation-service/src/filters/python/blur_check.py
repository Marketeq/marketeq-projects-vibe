import cv2
import sys

def is_clear(image_path, threshold=100.0):
    image = cv2.imread(image_path)
    if image is None:
        print("False")
        return
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    fm = cv2.Laplacian(gray, cv2.CV_64F).var()
    print("True" if fm >= threshold else "False")

if __name__ == "__main__":
    image_path = sys.argv[1]
    is_clear(image_path)
