import cv2
import os

os.makedirs("temp_faces", exist_ok=True)
cap = cv2.VideoCapture(0)
cv2.namedWindow("Capture Superadmin Face")

print("📸 Press SPACE to capture the face")
print("❌ Press ESC to cancel")

while True:
    ret, frame = cap.read()
    if not ret:
        print("Failed to grab frame")
        break

    cv2.imshow("Capture Superadmin Face", frame)
    k = cv2.waitKey(1)

    if k % 256 == 27:
        print("❌ Cancelled")
        break
    elif k % 256 == 32:
        img_path = os.path.join("temp_faces", "superadmin_face.jpg")
        cv2.imwrite(img_path, frame)
        print(f"✅ Temporarily saved: {img_path}")
        break

cap.release()
cv2.destroyAllWindows()
