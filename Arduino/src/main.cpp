#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include <secrets.h>

// WiFi variables
const char* ssid = SSID;
const char* password = PASS;
const char* mqtt_server = MQTT_BROKER;

// 60 RPM ~= 682 no analog write
// ~= 11/RPM

// Pin variables
const int ledBom = D1;
const int ledRuim = D2;
const int buttonPin = D5;
const int pinStatus = D0;

// Button variables
int buttonState = HIGH;
int lastButtonState = HIGH;
static unsigned long lastDebounceTime = 0;

// WiFi connection
WiFiClient espClient;
PubSubClient client(espClient);

// Connect to WiFi
void setup_wifi() {
  delay(10);
  if (password == "")
    WiFi.begin(ssid);
  else
    WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("");
  Serial.println("WiFi conectado");
  Serial.println(WiFi.localIP());
}

// Callback from MQTT
void callback(char* topic, byte* payload, unsigned int length) {
  String messageTemp;
  for (int i = 0; i < length; i++) {
    messageTemp += (char)payload[i];
  }

  Serial.println(messageTemp);
  
  if (String(topic) == "oee/pc") {
    digitalWrite(ledBom, LOW);
    digitalWrite(ledRuim, LOW);
    if(messageTemp == "BOA"){
      digitalWrite(ledBom, HIGH);
    } else if(messageTemp == "RUIM"){
      digitalWrite(ledRuim, HIGH);
    }
    delay(2000);
    digitalWrite(ledBom, LOW);
    digitalWrite(ledRuim, LOW);
  }
}

// Connect to MQTT broker
void reconnect() {
  while (!client.connected()) {
    Serial.println("Conectando...");
    if (client.connect("ESP8266Client")) {
      client.subscribe("oee/pc");
    } else {
      delay(5000);
    }
  }
}

void setup() {
  Serial.begin(9600);
  pinMode(ledBom, OUTPUT);
  pinMode(ledRuim, OUTPUT);
  pinMode(buttonPin, INPUT_PULLUP);
  pinMode(pinStatus, OUTPUT);
  setup_wifi();
  client.setServer(mqtt_server, 1883);
  client.setCallback(callback);
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    digitalWrite(ledBom, LOW);
    digitalWrite(ledRuim, LOW);
    digitalWrite(pinStatus, LOW);
    setup_wifi();
  }
  if (!client.connected()) {
    digitalWrite(ledBom, LOW);
    digitalWrite(ledRuim, LOW);
    digitalWrite(pinStatus, LOW);
    reconnect();
  }

  client.loop();

  buttonState = digitalRead(buttonPin);

  if (buttonState == LOW && lastButtonState == HIGH) {
    if (millis() - lastDebounceTime > 200) {
      analogWrite(pinStatus,210);
      delay(4000);
      digitalWrite(pinStatus, LOW);
      client.publish("oee/arduino", "scan");
      lastDebounceTime = millis();
    }
}
  lastButtonState = buttonState;
}