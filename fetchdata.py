from selenium import webdriver
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
import time

# URL of the webpage to scrape
url = 'https://www.hockeydb.com/ihdb/stats/pdisplay.php?pid=96607'

# Initialize Selenium WebDriver using ChromeDriverManager (no need for manual path)
driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()))

# Open the URL
driver.get(url)

# Wait for the page to fully load
time.sleep(3)

# Select all content on the page using Ctrl+A (Cmd+A for Mac)
body = driver.find_element(By.TAG_NAME, 'body')
body.send_keys(Keys.CONTROL + 'a')  # For Mac use: Keys.COMMAND + 'a'

# Copy all selected content using Ctrl+C (Cmd+C for Mac)
body.send_keys(Keys.CONTROL + 'c')  # For Mac use: Keys.COMMAND + 'c'

# Open file to save content (you can use driver.page_source as a simpler way to get all the HTML)
with open('page_content.txt', 'w', encoding='utf-8') as f:
    # Write the page's HTML content into the file
    f.write(driver.page_source)

# Close the browser
driver.quit()

print("Web page content saved to 'page_content.txt'.")
