from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

driver = webdriver.Firefox()
wait = WebDriverWait(driver, 10)

driver.get("http://localhost:5173")

# 1. Click "Create New"
create_btn = wait.until(
    EC.element_to_be_clickable((By.XPATH, "//button[contains(text(),'Create New')]"))
)
create_btn.click()

# 2. Wait for username field
username = wait.until(
    EC.visibility_of_element_located(
        (By.XPATH, "//input[contains(@placeholder,'How should others see you')]")
    )
)

password = driver.find_element(By.XPATH, "//input[contains(@placeholder,'Min')]")

# 3. Fill inputs
username.send_keys("greed")
password.send_keys("1234")

# 4. Click "Create Session"
create_session_btn = driver.find_element(
    By.XPATH, "//button[contains(text(),'Create Session')]"
)
create_session_btn.click()

# 5. VALIDATION
try:
    wait.until(EC.url_changes("http://localhost:5173"))
    print("✔  Selenium testing successfull 👍")
except:
    print("⚠ URL didn’t change — checking UI")

    # Option 2: Look for session indicator (adjust this later)
    try:
        wait.until(
            EC.presence_of_element_located(
                (By.XPATH, "//*[contains(text(),'Session')]")
            )
        )
        print("✔ Session created (UI detected)")
    except:
        print("✘ Session creation failed")
