@echo off
cd /d "%~dp0"
echo ============================================
echo   Updating UO AL-KAFEEL COD lecture site
echo ============================================
echo.
echo [1/3] Rebuilding the lecture list...
call node scripts\generate-manifest.mjs
echo.
echo [2/3] Saving changes...
git add -A
git commit -m "Add/update lectures"
echo.
echo [3/3] Uploading to the website...
git push
echo.
echo ============================================
echo   Done! The live site updates in 1-2 minutes:
echo   https://ialmowla24.github.io/iAlmowla4-dent/
echo ============================================
echo.
pause
