@echo off
setlocal

echo =====================================================================
echo   RELAY - TCP/HTTP Session Proxy and Load Balancer
echo   Computer Networks Monorepo
echo =====================================================================

rem 1. Check if existing JAVA_HOME has java.exe
if exist "%JAVA_HOME%\bin\java.exe" goto has_java

rem 2. Check local E:\jdk-21 JDK
if exist "E:\jdk-21\jdk-21.0.6+7\bin\java.exe" (
    set "JAVA_HOME=E:\jdk-21\jdk-21.0.6+7"
    echo [INFO] Detected Java at E:\jdk-21\jdk-21.0.6+7
    goto has_java
)

rem 3. Check AppData local JDK
if exist "C:\Users\DELL\AppData\Local\jdk-21\jdk-21.0.6+7\bin\java.exe" (
    set "JAVA_HOME=C:\Users\DELL\AppData\Local\jdk-21\jdk-21.0.6+7"
    echo [INFO] Detected Java at C:\Users\DELL\AppData\Local\jdk-21\jdk-21.0.6+7
    goto has_java
)

rem 4. Check standard Program Files JDK paths
if exist "C:\Program Files\Java\jdk-21\bin\java.exe" (
    set "JAVA_HOME=C:\Program Files\Java\jdk-21"
    goto has_java
)
if exist "C:\Program Files\Eclipse Adoptium\jdk-21.0.6.7-hotspot\bin\java.exe" (
    set "JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-21.0.6.7-hotspot"
    goto has_java
)

rem 5. Check if java is available on PATH
where java.exe >nul 2>nul
if %ERRORLEVEL% EQU 0 goto java_in_path

echo [ERROR] JAVA_HOME is not set or invalid. Please configure a Java 17+ JDK.
exit /b 1

:has_java
set "PATH=%JAVA_HOME%\bin;%PATH%"

:java_in_path
echo [1/3] Building Web Dashboard bundle (if needed)...
if not exist "web\dist\index.html" (
    pushd web
    call npm install
    call npm run build
    popd
)

echo [2/3] Compiling and starting Relay Engine and Control-Plane...
echo.
echo =====================================================================
echo   SERVICES LISTENING:
echo   - Web Management UI:      http://localhost:8000/
echo   - Control-Plane REST API: http://localhost:8000/api/...
echo   - Live WebSocket Stream:  ws://localhost:8000/live
echo   - Raw Socket Load Balancer Engine: http://localhost:8080/
echo     - /api/*    --^> API Pool (Ports 9001, 9002)
echo     - /static/* --^> Static Pool (Ports 9003, 9004)
echo.
echo   DEMO CREDENTIALS:
echo   - Email:    demo@relay.dev
echo   - Password: Demo@1234
echo =====================================================================
echo.

call .\gradlew.bat :api:run