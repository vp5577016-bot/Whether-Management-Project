<?php
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "polar_ems_db";

$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
    echo json_encode(["status" => "error", "message" => "DB Connection Failed"]);
    exit();
}

$wind = $_POST['wind'] ?? 15;
$temp = $_POST['temp'] ?? -40;

$sql = "INSERT INTO optimizer_logs (wind_speed, ambient_temp) VALUES ('$wind', '$temp')";

if ($conn->query($sql) === TRUE) {
    echo json_encode(["status" => "success", "message" => "Saved"]);
} else {
    echo json_encode(["status" => "error", "message" => $conn->error]);
}

$conn->close();
?>