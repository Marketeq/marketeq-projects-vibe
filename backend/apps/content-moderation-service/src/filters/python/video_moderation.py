import cv2
import torch
from PIL import Image
from transformers import CLIPProcessor, CLIPModel


model = CLIPModel.from_pretrained("openai/clip-vit-base-patch16")
processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch16")


device = "cuda" if torch.cuda.is_available() else "cpu"
model = model.to(device)


text_labels = ["appropriate content", "inappropriate content"]


text_inputs = processor(text=text_labels, return_tensors="pt", padding=True).to(device)
text_features = model.get_text_features(**text_inputs)


text_features = text_features / text_features.norm(p=2, dim=-1, keepdim=True)

def moderate_video(video_path: str) -> bool:
    cap = cv2.VideoCapture(video_path)

    frame_count = 0
    flagged = False

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        frame_count += 1

        
        if frame_count % 10 != 0:
            continue

        
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        pil_image = Image.fromarray(frame_rgb)

        
        inputs = processor(images=pil_image, return_tensors="pt").to(device)
        image_features = model.get_image_features(**inputs)

        
        image_features = image_features / image_features.norm(p=2, dim=-1, keepdim=True)

        
        similarity = torch.matmul(image_features, text_features.T)

        
        predicted_label = torch.argmax(similarity, dim=1).item()

        if predicted_label == 1:  
            print(f"Frame {frame_count}: flagged")
            flagged = True
            break

    cap.release()

    if flagged:
        print("Video flagged.")
        return False
    else:
        print("Video is appropriate.")
        return True


if __name__ == "__main__":
    moderate_video("path_to_video.mp4")
