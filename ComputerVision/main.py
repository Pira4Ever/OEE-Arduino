import cv2
from paho.mqtt import client as mqtt_client
from typing import List, Dict

broker = '127.0.0.1'
port = 1883
publish_topic = "oee/pc"
subscribe_topic = "oee/arduino"

class Detector():
    cap: cv2.VideoCapture
    fps: int
    threshold_value = 120
    blur_size = 18
    min_area = 2000
    epsilon_factor = 0.02
    use_adaptive = True  # False = limiar fixo, True = adaptativo
    index_map: Dict[int, str] = {0: 'BOA', 1: 'RUIM'}
    def __init__(self, source: str | int):
        self.cap = cv2.VideoCapture(source)
        self.fps = int(self.cap.get(cv2.CAP_PROP_FPS)) 

    def nothing(self, x):
        pass 

    def scan(self):
        detections: List[int] = [0, 0]
        for _ in range(self.fps):
            ret, frame = self.cap.read()
            if not ret:
                break

            # Garante que o blur seja ímpar (necessário para GaussianBlur)
            if self.blur_size < 1:
                self.blur_size = 1
            if self.blur_size % 2 == 0:
                self.blur_size += 1

            # Pré-processamento
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            blurred = cv2.GaussianBlur(gray, (self.blur_size, self.blur_size), 0)

            # Binarização (limiar fixo ou adaptativo)
            if self.use_adaptive:
                # Limiar adaptativo (ótimo para iluminação não uniforme)
                thresh = cv2.adaptiveThreshold(blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                            cv2.THRESH_BINARY_INV, 11, 2)
            else:
                _, thresh = cv2.threshold(blurred, self.threshold_value, 255, cv2.THRESH_BINARY_INV)

            # Encontra contornos
            contornos, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

            for cnt in contornos:
                area = cv2.contourArea(cnt)
                if area < self.min_area:
                    continue

                peri = cv2.arcLength(cnt, True)
                if peri == 0:
                    continue
                approx = cv2.approxPolyDP(cnt, self.epsilon_factor * peri, True)
                vertices = len(approx)

                if vertices < 6:
                    detections[0] = detections[0] + 1
                else:
                    detections[1] = detections[1] + 1

        detectado = self.index_map.get(detections.index(max(detections)))

        print(detections)

        print(detectado)

        return detectado


class MyClient():
    client: mqtt_client.Client
    publish_topic: str
    detector: Detector
    def __init__(self, broker: str, port: int, publish_topic: str, subscribe_topic: str):
        self.client = mqtt_client.Client(client_id='python-client',callback_api_version=mqtt_client.CallbackAPIVersion.VERSION2)
        self.client.on_connect = self.on_connect
        self.publish_topic = publish_topic
        self.client.connect(broker, port)
        self.client.subscribe(subscribe_topic)
        self.client.on_message = self.on_message
        self.detector = Detector(1)
        self.client.loop_start()
        
    def on_connect(self, client, userdata, flags, reason_code, properties):
        if reason_code == 0:
            print("Connected to MQTT Broker!")
        else:
            print(f"Failed to connect, return code {reason_code}")

    def publish(self, msg: str) -> bool:
        result = self.client.publish(self.publish_topic, msg)
        return result[0] == 0
    
    def on_message(self, client, userdata, msg):
        if msg.topic == 'oee/arduino':
            if msg.payload.decode() == 'scan':
                self.publish(f'{self.detector.scan()}')
            elif msg.payload.decode() == 'stop':
                self.detector.cap.release()
                cv2.destroyAllWindows()
                self.client.loop_stop()
        print(f"Received `{msg.payload.decode()}` from `{msg.topic}` topic")

client = MyClient(broker, port, publish_topic, subscribe_topic)
input('Pressione ENTER para sair')
