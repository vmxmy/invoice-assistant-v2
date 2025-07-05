
import asyncio
import os
from datetime import datetime, timedelta
from typing import Dict, Any, List
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from dotenv import load_dotenv

# Since this script is in the backend directory, we can import from app
from app.services.mailgun_service import MailgunService

# Load environment variables from .env file
load_dotenv()

class EmailStatsCollector:
    def __init__(self):
        self.mailgun_service = MailgunService()

    async def get_stats(self, days: int = 7) -> Dict[str, Any]:
        """
        Fetches email delivery statistics from Mailgun.
        """
        print(f"Fetching email delivery stats for the last {days} days...")
        stats = await self.mailgun_service.get_delivery_stats(days=days)
        if not stats:
            print("Could not retrieve statistics. Please check your Mailgun API key and domain.")
            return {}
        return stats

    def process_stats(self, stats: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Processes the raw stats from Mailgun into a more usable format.
        """
        if 'stats' not in stats:
            return []
            
        processed_stats = []
        for entry in stats['stats']:
            day_stats = {
                'date': datetime.strptime(entry['time'], '%Y-%m-%dT00:00:00.000Z'),
                'delivered': entry.get('delivered', {}).get('total', 0),
                'failed': entry.get('failed', {}).get('permanent', {}).get('total', 0) + entry.get('failed', {}).get('temporary', {}).get('total', 0),
                'accepted': entry.get('accepted', {}).get('total', 0)
            }
            processed_stats.append(day_stats)
        
        # Sort by date
        processed_stats.sort(key=lambda x: x['date'])
        return processed_stats

    def generate_chart(self, processed_stats: List[Dict[str, Any]], output_path: str = "email_delivery_stats.png"):
        """
        Generates a chart from the processed statistics.
        """
        if not processed_stats:
            print("No data available to generate chart.")
            return

        dates = [s['date'] for s in processed_stats]
        delivered = [s['delivered'] for s in processed_stats]
        failed = [s['failed'] for s in processed_stats]
        accepted = [s['accepted'] for s in processed_stats]

        fig, ax = plt.subplots(figsize=(12, 7))

        ax.plot(dates, accepted, label='Accepted', marker='o', linestyle='-', color='blue')
        ax.plot(dates, delivered, label='Delivered', marker='o', linestyle='-', color='green')
        ax.plot(dates, failed, label='Failed', marker='o', linestyle='-', color='red')

        # Formatting the chart
        ax.set_title('Email Delivery Statistics (Last 7 Days)', fontsize=16)
        ax.set_xlabel('Date', fontsize=12)
        ax.set_ylabel('Number of Emails', fontsize=12)
        ax.legend()
        ax.grid(True, which='both', linestyle='--', linewidth=0.5)
        
        # Format x-axis dates
        ax.xaxis.set_major_formatter(mdates.DateFormatter('%Y-%m-%d'))
        ax.xaxis.set_major_locator(mdates.DayLocator())
        fig.autofmt_xdate()

        plt.tight_layout()
        plt.savefig(output_path)
        print(f"Chart saved to {output_path}")

async def main():
    """
    Main function to run the email stats collector.
    """
    # This is a bit of a hack to make sure the script can find the app module
    import sys
    # Add backend to path
    sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

    collector = EmailStatsCollector()
    raw_stats = await collector.get_stats(days=7)
    
    if raw_stats:
        processed_stats = collector.process_stats(raw_stats)
        collector.generate_chart(processed_stats)

if __name__ == "__main__":
    # Set the python path to include the backend directory
    import sys
    import os
    # Add backend to path
    sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))
    
    # Load environment variables from .env file in the parent directory
    dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
    load_dotenv(dotenv_path=dotenv_path)
    
    # Now we can import the app
    from app.core.config import settings
    
    # Check if the required settings are present
    if not settings.mailgun_api_key or not settings.mailgun_domain:
        print("MAILGUN_API_KEY and MAILGUN_DOMAIN must be set in your .env file.")
    else:
        asyncio.run(main())
