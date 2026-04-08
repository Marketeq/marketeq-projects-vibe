from PIL import Image
from transformers import CLIPProcessor, CLIPModel
import torch


device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

model = CLIPModel.from_pretrained("openai/clip-vit-base-patch16").to(device)
processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch16")


labels = ["a safe image", "an unsafe image"]
text_inputs = processor(text=labels, return_tensors="pt", padding=True).to(device)

def moderate_image(image_path: str) -> bool:
    image = Image.open(image_path).convert("RGB")


    inputs = processor(images=image, return_tensors="pt", padding=True).to(device)
    outputs = model(**inputs, **text_inputs)

    image_features = outputs.image_embeds
    text_features = outputs.text_embeds
    logits_per_image = image_features @ text_features.T
    probs = logits_per_image.softmax(dim=-1)

    predicted_label = labels[probs.argmax().item()]
    confidence = probs.max().item()

    print(f"Prediction: {predicted_label} (confidence: {confidence:.2f})")

    if predicted_label == "an unsafe image":
        print("Potentially unsafe image detected.")
        return False
    else:
        print("Image is considered safe.")
        return True

if __name__ == "__main__":
    image_path = "path/to/your/image.jpg"  
    moderate_image(image_path)
