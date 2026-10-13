@echo off
title He Thong Tram Xang Thai Nguyen
echo ========================================================
echo   HE THONG QUAN LY TRAM XANG THAI NGUYEN (STANDALONE)
echo ========================================================
echo.
echo Server dang khoi dong va lang nghe tai port 3000...
echo.
echo Link truy cap Noi bo (Wi-Fi/LAN): http://192.168.0.101:3000
echo Link truy cap Toan cau (Ngrok):  https://dotted-tusk-construct.ngrok-free.dev
echo.
echo Nhan Ctrl+C de dung server.
echo.
cd /d "%~dp0"
node server/server.js
pause
