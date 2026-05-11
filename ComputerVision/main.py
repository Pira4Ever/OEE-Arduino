import cv2
import numpy as np

# Variáveis globais para os trackbars
threshold_value = 120
blur_size = 5
min_area = 500
epsilon_factor = 0.04
use_adaptive = False  # False = limiar fixo, True = adaptativo

def nothing(x):
    pass

# Inicializa a captura de vídeo (0 = webcam, ou substitua pelo caminho do seu vídeo)
cap = cv2.VideoCapture(1)
if not cap.isOpened():
    print("Erro ao abrir a câmera/vídeo")
    exit()

# Cria uma janela para as trackbars
cv2.namedWindow('Ajustes')
cv2.createTrackbar('Threshold', 'Ajustes', threshold_value, 255, nothing)
cv2.createTrackbar('Blur (ímpar)', 'Ajustes', blur_size, 30, nothing)
cv2.createTrackbar('Min Area', 'Ajustes', min_area, 2000, nothing)
cv2.createTrackbar('Epsilon (%)', 'Ajustes', int(epsilon_factor * 100), 20, nothing)
cv2.createTrackbar('Adaptativo (0=Fixo,1=Adapt)', 'Ajustes', 0, 1, nothing)

print("Ajuste os sliders em tempo real. Pressione 'q' para sair.")

while True:
    ret, frame = cap.read()
    if not ret:
        break

    # Lê os valores atuais das trackbars
    threshold_value = cv2.getTrackbarPos('Threshold', 'Ajustes')
    blur_size = cv2.getTrackbarPos('Blur (ímpar)', 'Ajustes')
    min_area = cv2.getTrackbarPos('Min Area', 'Ajustes')
    epsilon_factor = cv2.getTrackbarPos('Epsilon (%)', 'Ajustes') / 100.0
    use_adaptive = cv2.getTrackbarPos('Adaptativo (0=Fixo,1=Adapt)', 'Ajustes') == 1

    # Garante que o blur seja ímpar (necessário para GaussianBlur)
    if blur_size < 1:
        blur_size = 1
    if blur_size % 2 == 0:
        blur_size += 1

    # Pré-processamento
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (blur_size, blur_size), 0)

    # Binarização (limiar fixo ou adaptativo)
    if use_adaptive:
        # Limiar adaptativo (ótimo para iluminação não uniforme)
        thresh = cv2.adaptiveThreshold(blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                       cv2.THRESH_BINARY_INV, 11, 2)
    else:
        _, thresh = cv2.threshold(blurred, threshold_value, 255, cv2.THRESH_BINARY_INV)

    # Encontra contornos
    contornos, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    # Cria uma cópia do frame para desenhar
    output = frame.copy()
    for cnt in contornos:
        area = cv2.contourArea(cnt)
        if area < min_area:
            continue

        peri = cv2.arcLength(cnt, True)
        if peri == 0:
            continue
        approx = cv2.approxPolyDP(cnt, epsilon_factor * peri, True)
        vertices = len(approx)

        # Classificação
        if vertices == 4:
            x, y, w, h = cv2.boundingRect(approx)
            aspecto = w / float(h)
            if 0.95 <= aspecto <= 1.05:
                forma = "QUADRADO"
                cor = (0, 0, 255)  # vermelho
            else:
                forma = "RETANGULO"
                cor = (0, 165, 255)
        elif vertices >= 6:
            # Usa circularidade para distinguir círculo
            area_circ = area
            perimetro = peri
            circularidade = 4 * np.pi * area_circ / (perimetro * perimetro)
            if circularidade > 0.7:
                forma = "CIRCULO"
                cor = (0, 255, 0)  # verde
            else:
                forma = "ELIPSE"
                cor = (255, 255, 0)
        elif vertices == 3:
            forma = "TRIANGULO"
            cor = (255, 0, 0)
        else:
            forma = "DESCONHECIDO"
            cor = (255, 255, 255)

        cv2.drawContours(output, [cnt], -1, cor, 2)
        x, y, w, h = cv2.boundingRect(cnt)
        cv2.putText(output, f"{forma} ({area:.0f})", (x, y - 10),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, cor, 2)

    # Mostra a imagem binarizada (para debug)
    cv2.imshow('Binarizado', thresh)
    cv2.imshow('Detecção', output)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()