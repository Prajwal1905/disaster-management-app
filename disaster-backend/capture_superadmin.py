import cv2

# Open webcam
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

    if k % 256 == 27:  # ESC pressed
        print("❌ Closing without capturing")
        break
    elif k % 256 == 32:  # SPACE pressed
        img_name = "superadmin_face.jpg"
        cv2.imwrite(img_name, frame)
        print(f"✅ Saved image as {img_name}")
        break

cap.release()
cv2.destroyAllWindows()
