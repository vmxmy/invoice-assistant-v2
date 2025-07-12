"""IMAP client for email operations."""
import imaplib
import email
from email import message
from email.header import decode_header
from typing import List, Tuple, Dict, Optional, Any
import logging
from datetime import datetime
import re

logger = logging.getLogger(__name__)


class IMAPClient:
    """IMAP client for email operations."""
    
    def __init__(self, host: str, port: int = 993, use_ssl: bool = True):
        """Initialize IMAP client.
        
        Args:
            host: IMAP server hostname
            port: IMAP server port (default: 993 for SSL)
            use_ssl: Whether to use SSL connection
        """
        self.host = host
        self.port = port
        self.use_ssl = use_ssl
        self.connection: Optional[imaplib.IMAP4_SSL] = None
        
    def connect(self, username: str, password: str) -> bool:
        """Connect to IMAP server and authenticate.
        
        Args:
            username: Email username
            password: Email password
            
        Returns:
            True if connection successful, False otherwise
        """
        try:
            if self.use_ssl:
                self.connection = imaplib.IMAP4_SSL(self.host, self.port)
            else:
                self.connection = imaplib.IMAP4(self.host, self.port)
                
            self.connection.login(username, password)
            logger.info(f"Successfully connected to {self.host} as {username}")
            return True
        except Exception as e:
            logger.error(f"Failed to connect to {self.host}: {str(e)}")
            return False
            
    def disconnect(self):
        """Disconnect from IMAP server."""
        if self.connection:
            try:
                self.connection.close()
                self.connection.logout()
            except:
                pass
            self.connection = None
            
    def list_folders(self) -> List[str]:
        """List all folders in the mailbox.
        
        Returns:
            List of folder names
        """
        if not self.connection:
            return []
            
        try:
            status, folders = self.connection.list()
            if status == 'OK':
                folder_list = []
                for folder in folders:
                    if isinstance(folder, bytes):
                        folder = folder.decode('utf-8')
                    # Extract folder name from IMAP response
                    match = re.search(r'"([^"]+)"$', folder)
                    if match:
                        folder_list.append(match.group(1))
                return folder_list
        except Exception as e:
            logger.error(f"Failed to list folders: {str(e)}")
            return []
            
    def select_folder(self, folder: str = 'INBOX') -> bool:
        """Select a folder to work with.
        
        Args:
            folder: Folder name (default: INBOX)
            
        Returns:
            True if selection successful
        """
        if not self.connection:
            return False
            
        try:
            status, data = self.connection.select(folder)
            return status == 'OK'
        except Exception as e:
            logger.error(f"Failed to select folder {folder}: {str(e)}")
            return False
            
    def search_emails(self, criteria: str = 'ALL', charset: str = 'UTF-8') -> List[str]:
        """Search emails based on criteria.
        
        Args:
            criteria: IMAP search criteria (e.g., 'ALL', 'UNSEEN', 'FROM "sender@example.com"')
            charset: Character set for search
            
        Returns:
            List of email IDs matching the criteria
        """
        if not self.connection:
            return []
            
        try:
            status, data = self.connection.search(charset, criteria)
            if status == 'OK' and data[0]:
                return data[0].split()
            return []
        except Exception as e:
            logger.error(f"Failed to search emails: {str(e)}")
            return []
            
    def fetch_email(self, email_id: str) -> Optional[message.Message]:
        """Fetch a single email by ID.
        
        Args:
            email_id: Email ID to fetch
            
        Returns:
            Email message object or None if failed
        """
        if not self.connection:
            return None
            
        try:
            status, data = self.connection.fetch(email_id, '(RFC822)')
            if status == 'OK' and data[0]:
                raw_email = data[0][1]
                return email.message_from_bytes(raw_email)
        except Exception as e:
            logger.error(f"Failed to fetch email {email_id}: {str(e)}")
            return None
            
    def get_email_info(self, msg: message.Message) -> Dict[str, Any]:
        """Extract basic information from email message.
        
        Args:
            msg: Email message object
            
        Returns:
            Dictionary with email information
        """
        info = {
            'subject': '',
            'from': '',
            'to': '',
            'date': '',
            'attachments': []
        }
        
        # Extract subject
        subject = msg.get('Subject', '')
        if subject:
            decoded_subject = decode_header(subject)
            subject_parts = []
            for part, encoding in decoded_subject:
                if isinstance(part, bytes):
                    part = part.decode(encoding or 'utf-8', errors='ignore')
                subject_parts.append(part)
            info['subject'] = ''.join(subject_parts)
            
        # Extract from, to, date
        info['from'] = msg.get('From', '')
        info['to'] = msg.get('To', '')
        info['date'] = msg.get('Date', '')
        
        # Check for attachments
        for part in msg.walk():
            if part.get_content_disposition() == 'attachment':
                filename = part.get_filename()
                if filename:
                    decoded_filename = decode_header(filename)
                    filename_parts = []
                    for part_name, encoding in decoded_filename:
                        if isinstance(part_name, bytes):
                            part_name = part_name.decode(encoding or 'utf-8', errors='ignore')
                        filename_parts.append(part_name)
                    info['attachments'].append(''.join(filename_parts))
                    
        return info
        
    def download_attachment(self, msg: message.Message, filename: str) -> Optional[bytes]:
        """Download a specific attachment from email.
        
        Args:
            msg: Email message object
            filename: Name of the attachment to download
            
        Returns:
            Attachment content as bytes or None if not found
        """
        for part in msg.walk():
            if part.get_content_disposition() == 'attachment':
                part_filename = part.get_filename()
                if part_filename:
                    decoded_filename = decode_header(part_filename)
                    filename_parts = []
                    for part_name, encoding in decoded_filename:
                        if isinstance(part_name, bytes):
                            part_name = part_name.decode(encoding or 'utf-8', errors='ignore')
                        filename_parts.append(part_name)
                    decoded_filename = ''.join(filename_parts)
                    
                    if decoded_filename == filename:
                        return part.get_payload(decode=True)
                        
        return None
        
    def mark_as_read(self, email_id: str) -> bool:
        """Mark an email as read.
        
        Args:
            email_id: Email ID to mark as read
            
        Returns:
            True if successful
        """
        if not self.connection:
            return False
            
        try:
            self.connection.store(email_id, '+FLAGS', '\\Seen')
            return True
        except Exception as e:
            logger.error(f"Failed to mark email {email_id} as read: {str(e)}")
            return False
            
    def move_to_folder(self, email_id: str, target_folder: str) -> bool:
        """Move an email to another folder.
        
        Args:
            email_id: Email ID to move
            target_folder: Target folder name
            
        Returns:
            True if successful
        """
        if not self.connection:
            return False
            
        try:
            # Copy to target folder
            result = self.connection.copy(email_id, target_folder)
            if result[0] == 'OK':
                # Mark for deletion in current folder
                self.connection.store(email_id, '+FLAGS', '\\Deleted')
                # Expunge to actually delete
                self.connection.expunge()
                return True
            return False
        except Exception as e:
            logger.error(f"Failed to move email {email_id} to {target_folder}: {str(e)}")
            return False