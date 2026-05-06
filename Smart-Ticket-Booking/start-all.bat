@echo off
echo ========================================
echo   SmartTicket - Starting All Services
echo ========================================

echo.
echo [1/3] Starting Backend (Node.js)...
start "SmartTicket Backend" cmd /k "cd backend && npm run dev"

timeout /t 3 /nobreak > nul

echo [2/3] Starting Frontend (React)...
start "SmartTicket Frontend" cmd /k "cd frontend && npm run dev"

timeout /t 2 /nobreak > nul

echo [3/3] Starting Chatbot Service (Python)...
start "SmartTicket Chatbot" cmd /k "cd chatbot-service && python main.py"

echo.
echo ========================================
echo   All services started!
echo   Frontend:  http://localhost:5173
echo   Backend:   http://localhost:5000
echo   Chatbot:   http://localhost:8000
echo   API Docs:  http://localhost:8000/docs
echo ========================================
echo.
echo Demo Login:
echo   Admin:   admin@smartticket.com / Admin@123
echo   Company: redbus@example.com / Company@123
echo ========================================
pause
