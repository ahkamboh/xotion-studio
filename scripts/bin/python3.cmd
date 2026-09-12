@echo off
where py >nul 2>&1 && (
  py -3 %*
  exit /b %ERRORLEVEL%
)
python %*
