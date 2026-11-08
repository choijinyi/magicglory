$ErrorActionPreference = 'Stop'
$adminName = Read-Host 'Administrator username (default: admin1004)'
if ([string]::IsNullOrWhiteSpace($adminName)) { $adminName = 'admin1004' }
$adminSecurePassword = Read-Host 'Administrator password' -AsSecureString
$adminPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($adminSecurePassword)
try {
    $adminPlainPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($adminPointer)
    @{ username = $adminName; password = $adminPlainPassword } | ConvertTo-Json -Compress | node (Join-Path $PSScriptRoot 'configure-admin.mjs')
    if ($LASTEXITCODE -ne 0) { throw 'Administrator setup failed.' }
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($adminPointer)
    $adminPlainPassword = $null
}
