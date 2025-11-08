import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.keys import Keys
import pyautogui
import pyperclip

# Set up the Chrome WebDriver
driver = webdriver.Chrome()

# Open a webpage (replace with your desired URL)
url = "https://www.hockeydb.com/ihdb/stats/pdisplay.php?pid=96607"
driver.get(url)

# Wait for the page to load
time.sleep(5)

# Find and click the "View as text" link
try:
    view_as_text = WebDriverWait(driver, 10).until(
        EC.element_to_be_clickable((By.XPATH, "//a[contains(text(), 'View as text') or contains(text(), 'Text-only version')]"))
    )
    view_as_text.click()
    
    # Wait for the text version to load
    time.sleep(5)
except:
    print("Could not find 'View as text' link. Proceeding with the current page.")

# Get the dimensions of the page
width = driver.execute_script("return document.documentElement.clientWidth")
height = driver.execute_script("return document.documentElement.clientHeight")

# Move the mouse to the center of the page
pyautogui.moveTo(width/2, height/2)

# Perform a left click
pyautogui.click()

# Select all content (Ctrl+A)
ActionChains(driver).key_down(Keys.CONTROL).send_keys('a').key_up(Keys.CONTROL).perform()

# Copy the selected content (Ctrl+C)
ActionChains(driver).key_down(Keys.CONTROL).send_keys('c').key_up(Keys.CONTROL).perform()

# Get the copied content from clipboard
content = pyperclip.paste()

# Create a text file and write the content
with open('scraped_content.txt', 'w', encoding='utf-8') as file:
    file.write(content)

# Close the browser
driver.quit()

print("Content has been scraped and saved to 'scraped_content.txt'")