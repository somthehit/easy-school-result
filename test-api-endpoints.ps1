# API Test Suite for School Result App
# PowerShell script to test all API endpoints

$BaseUrl = "http://localhost:3000/api"
$TestResults = @()

# Test configuration
$Headers = @{
    "Content-Type" = "application/json"
    "x-user-id" = "test-user-123"
}

$TestData = @{
    ValidUUID = "550e8400-e29b-41d4-a716-446655440000"
    InvalidUUID = "invalid-uuid"
    ValidDate = "2005-01-15"
    ValidToken = "test-token-123"
}

function Test-Endpoint {
    param(
        [string]$Endpoint,
        [string]$Method = "GET",
        [hashtable]$Body = $null,
        [string]$Scenario,
        [hashtable]$CustomHeaders = @{}
    )
    
    $AllHeaders = $Headers.Clone()
    foreach ($key in $CustomHeaders.Keys) {
        $AllHeaders[$key] = $CustomHeaders[$key]
    }
    
    try {
        $Uri = "$BaseUrl$Endpoint"
        $RequestParams = @{
            Uri = $Uri
            Method = $Method
            Headers = $AllHeaders
            TimeoutSec = 10
        }
        
        if ($Body -and ($Method -eq "POST" -or $Method -eq "PUT" -or $Method -eq "PATCH")) {
            $RequestParams.Body = ($Body | ConvertTo-Json -Depth 10)
        }
        
        $Response = Invoke-WebRequest @RequestParams -ErrorAction Stop
        $StatusCode = $Response.StatusCode
        $Content = $Response.Content
        
        $Result = @{
            Endpoint = $Endpoint
            Method = $Method
            Scenario = $Scenario
            StatusCode = $StatusCode
            Success = ($StatusCode -ge 200 -and $StatusCode -lt 400)
            Response = $Content.Substring(0, [Math]::Min(200, $Content.Length))
            Error = $null
            Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        }
        
        if ($Result.Success) {
            Write-Host "✅ $Method $Endpoint - $Scenario : $StatusCode" -ForegroundColor Green
        } else {
            Write-Host "❌ $Method $Endpoint - $Scenario : $StatusCode" -ForegroundColor Red
        }
        
    } catch {
        $StatusCode = if ($_.Exception.Response) { $_.Exception.Response.StatusCode.Value__ } else { 0 }
        $Result = @{
            Endpoint = $Endpoint
            Method = $Method
            Scenario = $Scenario
            StatusCode = $StatusCode
            Success = $false
            Response = $null
            Error = $_.Exception.Message
            Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        }
        
        Write-Host "❌ $Method $Endpoint - $Scenario : $StatusCode - $($_.Exception.Message)" -ForegroundColor Red
    }
    
    $script:TestResults += $Result
    return $Result
}

function Test-StudentsEndpoints {
    Write-Host "`n🧪 Testing Students Endpoints" -ForegroundColor Cyan
    
    # Test bulk import with valid data
    $ValidStudentData = @{
        classId = $TestData.ValidUUID
        data = @(
            @{
                name = "John Doe"
                rollNo = 1
                section = "A"
                dob = $TestData.ValidDate
                contact = "1234567890"
                parentName = "Parent Name"
                fathersName = "Father Name"
                mothersName = "Mother Name"
                address = "123 Street"
                gender = "Male"
            }
        )
    }
    
    Test-Endpoint -Endpoint "/students/bulk-import" -Method "POST" -Body $ValidStudentData -Scenario "Valid bulk import"
    
    # Test with invalid class ID
    $InvalidClassData = $ValidStudentData.Clone()
    $InvalidClassData.classId = $TestData.InvalidUUID
    Test-Endpoint -Endpoint "/students/bulk-import" -Method "POST" -Body $InvalidClassData -Scenario "Invalid class ID"
    
    # Test with missing required fields
    $MissingFieldsData = @{
        classId = $TestData.ValidUUID
        data = @(@{ name = "John Doe" })
    }
    Test-Endpoint -Endpoint "/students/bulk-import" -Method "POST" -Body $MissingFieldsData -Scenario "Missing required fields"
    
    # Test with empty data array
    $EmptyData = @{
        classId = $TestData.ValidUUID
        data = @()
    }
    Test-Endpoint -Endpoint "/students/bulk-import" -Method "POST" -Body $EmptyData -Scenario "Empty data array"
}

function Test-MarksEndpoints {
    Write-Host "`n🧪 Testing Marks Endpoints" -ForegroundColor Cyan
    
    # Test bulk import
    $ValidMarksData = @{
        examId = $TestData.ValidUUID
        classId = $TestData.ValidUUID
        data = @(
            @{
                rollNo = 1
                subjectCode = "MATH"
                subjectPart = "theory"
                obtained = 85
            }
        )
    }
    
    Test-Endpoint -Endpoint "/marks/bulk-import" -Method "POST" -Body $ValidMarksData -Scenario "Valid marks import"
    
    # Test bulk marks update
    $BulkMarksData = @{
        examId = $TestData.ValidUUID
        subjectId = $TestData.ValidUUID
        items = @(
            @{
                studentId = $TestData.ValidUUID
                subjectPartId = $TestData.ValidUUID
                obtained = 85
                converted = 85
            }
        )
    }
    
    Test-Endpoint -Endpoint "/marks/bulk" -Method "POST" -Body $BulkMarksData -Scenario "Valid bulk marks update"
    
    # Test with invalid payload
    $InvalidMarksData = @{ examId = $TestData.ValidUUID }
    Test-Endpoint -Endpoint "/marks/bulk" -Method "POST" -Body $InvalidMarksData -Scenario "Invalid payload structure"
}

function Test-FlexibleMarksEndpoint {
    Write-Host "`n🧪 Testing Flexible Marks Endpoint" -ForegroundColor Cyan
    
    # Test valid flexible marks
    $ValidFlexibleData = @{
        examId = $TestData.ValidUUID
        studentId = $TestData.ValidUUID
        subjectId = $TestData.ValidUUID
        marks = @(
            @{
                partId = $TestData.ValidUUID
                obtained = 85
            }
        )
    }
    
    Test-Endpoint -Endpoint "/flexible-marks" -Method "POST" -Body $ValidFlexibleData -Scenario "Valid flexible marks"
    
    # Test without authentication
    Test-Endpoint -Endpoint "/flexible-marks" -Method "POST" -Body $ValidFlexibleData -Scenario "Missing authentication" -CustomHeaders @{"x-user-id" = ""}
    
    # Test with missing fields
    $IncompleteData = @{ examId = $TestData.ValidUUID }
    Test-Endpoint -Endpoint "/flexible-marks" -Method "POST" -Body $IncompleteData -Scenario "Missing required fields"
}

function Test-PublicResultEndpoint {
    Write-Host "`n🧪 Testing Public Result Endpoint" -ForegroundColor Cyan
    
    # Test valid verification
    $ValidVerifyData = @{
        token = $TestData.ValidToken
        dob = $TestData.ValidDate
    }
    
    Test-Endpoint -Endpoint "/public-result/verify" -Method "POST" -Body $ValidVerifyData -Scenario "Valid verification"
    
    # Test missing token
    $MissingTokenData = @{ dob = $TestData.ValidDate }
    Test-Endpoint -Endpoint "/public-result/verify" -Method "POST" -Body $MissingTokenData -Scenario "Missing token"
    
    # Test missing DOB
    $MissingDobData = @{ token = $TestData.ValidToken }
    Test-Endpoint -Endpoint "/public-result/verify" -Method "POST" -Body $MissingDobData -Scenario "Missing DOB"
    
    # Test invalid token
    $InvalidTokenData = @{
        token = "invalid-token"
        dob = $TestData.ValidDate
    }
    Test-Endpoint -Endpoint "/public-result/verify" -Method "POST" -Body $InvalidTokenData -Scenario "Invalid token"
}

function Test-ExamSettingsEndpoints {
    Write-Host "`n🧪 Testing Exam Settings Endpoints" -ForegroundColor Cyan
    
    # Test exam subject settings
    $ExamSubjectData = @{
        examId = $TestData.ValidUUID
        items = @(
            @{
                subjectId = $TestData.ValidUUID
                fullMark = 100
                passMark = 40
                hasConversion = $true
                convertToMark = 80
            }
        )
    }
    
    Test-Endpoint -Endpoint "/exam-subject-settings/bulk" -Method "POST" -Body $ExamSubjectData -Scenario "Valid exam subject settings"
    
    # Test exam subject part settings
    $ExamPartData = @{
        examId = $TestData.ValidUUID
        items = @(
            @{
                subjectId = $TestData.ValidUUID
                partType = "Theory"
                fullMark = 80
                passMark = 32
                hasConversion = $false
            }
        )
    }
    
    Test-Endpoint -Endpoint "/exam-subject-part-settings/bulk" -Method "POST" -Body $ExamPartData -Scenario "Valid exam part settings"
}

function Test-MasterSubjectsEndpoint {
    Write-Host "`n🧪 Testing Master Subjects Endpoint" -ForegroundColor Cyan
    
    $TestId = $TestData.ValidUUID
    
    # Test GET with usage action
    Test-Endpoint -Endpoint "/master-subjects/$TestId" -Method "GET" -Scenario "Get usage info" -CustomHeaders @{"x-user-id" = "test-user-123"}
    
    # Test GET without authentication
    Test-Endpoint -Endpoint "/master-subjects/$TestId" -Method "GET" -Scenario "No authentication" -CustomHeaders @{"x-user-id" = ""}
    
    # Test DELETE
    Test-Endpoint -Endpoint "/master-subjects/$TestId" -Method "DELETE" -Scenario "Delete master subject"
    
    # Test invalid action
    Test-Endpoint -Endpoint "/master-subjects/$TestId" -Method "GET" -Scenario "Invalid action" -CustomHeaders @{"x-user-id" = "test-user-123"}
}

function Generate-TestReport {
    $TotalTests = $TestResults.Count
    $PassedTests = ($TestResults | Where-Object { $_.Success }).Count
    $FailedTests = $TotalTests - $PassedTests
    $SuccessRate = if ($TotalTests -gt 0) { [Math]::Round(($PassedTests / $TotalTests) * 100, 1) } else { 0 }
    
    Write-Host "`n$('=' * 60)" -ForegroundColor Yellow
    Write-Host "📊 API TEST REPORT SUMMARY" -ForegroundColor Yellow
    Write-Host "$('=' * 60)" -ForegroundColor Yellow
    Write-Host "Total Tests: $TotalTests"
    Write-Host "Passed: $PassedTests ✅" -ForegroundColor Green
    Write-Host "Failed: $FailedTests ❌" -ForegroundColor Red
    Write-Host "Success Rate: $SuccessRate%"
    Write-Host "Test Date: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    
    Write-Host "`n📋 DETAILED RESULTS:" -ForegroundColor Yellow
    Write-Host "$('-' * 60)"
    
    for ($i = 0; $i -lt $TestResults.Count; $i++) {
        $result = $TestResults[$i]
        $status = if ($result.Success) { "✅" } else { "❌" }
        $color = if ($result.Success) { "Green" } else { "Red" }
        
        Write-Host "$($i + 1). $status $($result.Method) $($result.Endpoint)" -ForegroundColor $color
        Write-Host "   Scenario: $($result.Scenario)"
        Write-Host "   Status Code: $($result.StatusCode)"
        Write-Host "   Timestamp: $($result.Timestamp)"
        
        if ($result.Error) {
            Write-Host "   Error: $($result.Error)" -ForegroundColor Red
        }
        
        if ($result.Response) {
            Write-Host "   Response: $($result.Response)..."
        }
        
        Write-Host ""
    }
    
    # Export detailed results to JSON
    $ReportFile = "api-test-report-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"
    $TestResults | ConvertTo-Json -Depth 10 | Out-File -FilePath $ReportFile -Encoding UTF8
    Write-Host "📄 Detailed report saved to: $ReportFile" -ForegroundColor Cyan
    
    return @{
        Total = $TotalTests
        Passed = $PassedTests
        Failed = $FailedTests
        SuccessRate = $SuccessRate
        Results = $TestResults
    }
}

# Main execution
Write-Host "🚀 Starting API Test Suite for School Result App" -ForegroundColor Green
Write-Host "$('=' * 60)"

# Check if server is running
try {
    $ServerCheck = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✅ Server is running on localhost:3000" -ForegroundColor Green
} catch {
    Write-Host "❌ Server is not running on localhost:3000. Please start the development server first." -ForegroundColor Red
    Write-Host "Run: npm run dev" -ForegroundColor Yellow
    exit 1
}

$StartTime = Get-Date

# Run all tests
Test-StudentsEndpoints
Test-MarksEndpoints
Test-FlexibleMarksEndpoint
Test-PublicResultEndpoint
Test-ExamSettingsEndpoints
Test-MasterSubjectsEndpoint

$EndTime = Get-Date
$Duration = ($EndTime - $StartTime).TotalSeconds

Write-Host "`nTest Duration: $([Math]::Round($Duration, 2)) seconds" -ForegroundColor Cyan

# Generate and display report
$Report = Generate-TestReport

Write-Host "`n🏁 API Test Suite Completed!" -ForegroundColor Green

# Exit with appropriate code
if ($Report.Failed -gt 0) {
    exit 1
} else {
    exit 0
}
