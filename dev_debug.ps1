$nodePath = "C:\Program Files\nodejs\node.exe"
$nextPath = "f:\iki\netflowpro\node_modules\next\dist\bin\next"
Start-Process -FilePath $nodePath -ArgumentList "$nextPath dev" -RedirectStandardOutput "startup.log" -RedirectStandardError "startup.log" -NoNewWindow -PassThru
