"""
Web scraper for HockeyDB player data.
Uses Selenium with headless Chrome to fetch player pages.
"""
import time
from typing import Optional
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager


class HockeyDBScraper:
    """Scraper for HockeyDB player statistics."""

    def __init__(self, headless: bool = True, timeout: int = 10):
        """
        Initialize scraper.

        Args:
            headless: Run Chrome in headless mode
            timeout: Page load timeout in seconds
        """
        self.timeout = timeout
        self.driver = self._init_driver(headless)

    def _init_driver(self, headless: bool) -> webdriver.Chrome:
        """Initialize Chrome WebDriver."""
        options = Options()

        if headless:
            options.add_argument('--headless')

        options.add_argument('--disable-gpu')
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-dev-shm-usage')
        options.add_argument('--window-size=1920,1080')

        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=options)
        driver.set_page_load_timeout(self.timeout)

        return driver

    def scrape_player(self, url: str) -> Optional[str]:
        """
        Scrape player data from HockeyDB URL.

        Args:
            url: Player page URL (e.g., https://www.hockeydb.com/ihdb/stats/pdisplay.php?pid=96607)

        Returns:
            Text content of player page, or None on failure
        """
        try:
            print(f"Fetching: {url}")
            self.driver.get(url)

            # Wait for page to load
            WebDriverWait(self.driver, self.timeout).until(
                EC.presence_of_element_located((By.TAG_NAME, "body"))
            )

            # Try to click "View as text" link if available
            try:
                text_link = WebDriverWait(self.driver, 5).until(
                    EC.element_to_be_clickable((
                        By.XPATH,
                        "//a[contains(text(), 'View as text') or contains(text(), 'Text-only')]"
                    ))
                )
                text_link.click()
                time.sleep(2)
            except Exception:
                # Text view not available or already in text mode
                pass

            # Get page content
            content = self.driver.page_source

            # Extract text from body
            body = self.driver.find_element(By.TAG_NAME, 'body')
            text_content = body.text

            print(f"OK - Fetched {len(text_content)} characters")
            return text_content

        except Exception as e:
            print(f"FAILED - Error scraping {url}: {e}")
            return None

    def scrape_player_by_id(self, player_id: int) -> Optional[str]:
        """
        Scrape player by HockeyDB player ID.

        Args:
            player_id: HockeyDB player ID

        Returns:
            Text content of player page, or None on failure
        """
        url = f"https://www.hockeydb.com/ihdb/stats/pdisplay.php?pid={player_id}"
        return self.scrape_player(url)

    def save_to_file(self, content: str, file_path: str) -> bool:
        """
        Save scraped content to file.

        Args:
            content: Text content to save
            file_path: Output file path

        Returns:
            True on success, False on failure
        """
        try:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"Saved to: {file_path}")
            return True
        except Exception as e:
            print(f"FAILED - Error saving to {file_path}: {e}")
            return False

    def close(self):
        """Close the browser."""
        if self.driver:
            self.driver.quit()

    def __enter__(self):
        """Context manager entry."""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        self.close()


def scrape_multiple_players(
    player_ids: list[int],
    output_dir: str = '.',
    headless: bool = True
) -> dict[int, str]:
    """
    Scrape multiple players and save to files.

    Args:
        player_ids: List of HockeyDB player IDs
        output_dir: Directory to save output files
        headless: Run in headless mode

    Returns:
        Dictionary mapping player_id to output file path
    """
    results = {}

    with HockeyDBScraper(headless=headless) as scraper:
        for player_id in player_ids:
            content = scraper.scrape_player_by_id(player_id)

            if content:
                file_path = f"{output_dir}/player_{player_id}.txt"
                if scraper.save_to_file(content, file_path):
                    results[player_id] = file_path

            # Rate limiting
            time.sleep(1)

    return results


if __name__ == "__main__":
    # Example usage
    with HockeyDBScraper(headless=True) as scraper:
        # Scrape Steven Stamkos
        content = scraper.scrape_player_by_id(96607)

        if content:
            scraper.save_to_file(content, "stamkos.txt")
            print("Scraping complete")
        else:
            print("Scraping failed")
