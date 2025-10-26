import os

def save_face_image(file, folder="authority_faces", filename="unknown"):
    folder_path = os.path.join("static", folder)
    os.makedirs(folder_path, exist_ok=True)
    file_path = os.path.join(folder_path, f"{filename}.jpg")
    file.save(file_path)
    return file_path
