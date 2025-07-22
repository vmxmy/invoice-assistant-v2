"""Search criteria builder for imap-tools."""
from typing import List, Optional, Dict, Any, Union
from datetime import datetime, date, timedelta
from imap_tools import AND, OR, NOT, A, O, N, H
import logging

logger = logging.getLogger(__name__)


class SearchBuilder:
    """Build complex search criteria for imap-tools."""
    
    def __init__(self):
        self.criteria_parts = []
        
    def add_date_range(self, date_from: Optional[Union[str, date, datetime]] = None,
                      date_to: Optional[Union[str, date, datetime]] = None) -> 'SearchBuilder':
        """Add date range criteria.
        
        Args:
            date_from: Start date (inclusive) - can be string, date or datetime
            date_to: End date (inclusive) - can be string, date or datetime
            
        Returns:
            Self for chaining
        """
        if date_from:
            # 处理字符串格式的日期
            if isinstance(date_from, str):
                try:
                    # 解析 ISO 格式的日期字符串 (YYYY-MM-DD)
                    date_from = datetime.strptime(date_from, '%Y-%m-%d').date()
                except ValueError:
                    logger.error(f"无法解析 date_from 字符串: {date_from}")
                    raise ValueError(f"无效的日期格式: {date_from}，需要 YYYY-MM-DD 格式")
            elif isinstance(date_from, datetime):
                date_from = date_from.date()
            elif not isinstance(date_from, date):
                logger.error(f"未知的 date_from 类型: {type(date_from)}")
                raise TypeError(f"date_from 必须是字符串、date 或 datetime 对象")
                
            self.criteria_parts.append(('date_gte', date_from))
            logger.debug(f"Added date_from: {date_from}")
            
        if date_to:
            # 处理字符串格式的日期
            if isinstance(date_to, str):
                try:
                    # 解析 ISO 格式的日期字符串 (YYYY-MM-DD)
                    date_to = datetime.strptime(date_to, '%Y-%m-%d').date()
                except ValueError:
                    logger.error(f"无法解析 date_to 字符串: {date_to}")
                    raise ValueError(f"无效的日期格式: {date_to}，需要 YYYY-MM-DD 格式")
            elif isinstance(date_to, datetime):
                date_to = date_to.date()
            elif not isinstance(date_to, date):
                logger.error(f"未知的 date_to 类型: {type(date_to)}")
                raise TypeError(f"date_to 必须是字符串、date 或 datetime 对象")
                
            # imap-tools date_lt is exclusive, so add 1 day
            self.criteria_parts.append(('date_lt', date_to + timedelta(days=1)))
            logger.debug(f"Added date_to: {date_to} (search until {date_to + timedelta(days=1)})")
            
        return self
        
    def add_subject_keywords(self, keywords: List[str], 
                            match_all: bool = False) -> 'SearchBuilder':
        """Add subject keyword criteria.
        
        Args:
            keywords: List of keywords to search
            match_all: If True, all keywords must match (AND)
                      If False, any keyword can match (OR)
                      
        Returns:
            Self for chaining
        """
        if not keywords:
            return self
            
        if len(keywords) == 1:
            self.criteria_parts.append(('subject', keywords[0]))
        else:
            keyword_conditions = [A(subject=kw) for kw in keywords]
            if match_all:
                # All keywords must match
                self.criteria_parts.append(('and_subjects', keyword_conditions))
            else:
                # Any keyword can match
                self.criteria_parts.append(('or_subjects', keyword_conditions))
                
        logger.debug(f"Added subject keywords: {keywords} (match_all={match_all})")
        return self
        
    def add_exclude_keywords(self, keywords: List[str]) -> 'SearchBuilder':
        """Add keywords to exclude from subject.
        
        Args:
            keywords: List of keywords to exclude
            
        Returns:
            Self for chaining
        """
        for keyword in keywords:
            self.criteria_parts.append(('not_subject', keyword))
            
        if keywords:
            logger.debug(f"Added exclude keywords: {keywords}")
        return self
        
    def add_sender_filters(self, senders: List[str], 
                          match_all: bool = False) -> 'SearchBuilder':
        """Add sender email filters.
        
        Args:
            senders: List of sender email addresses
            match_all: If True, email must be from all senders (unusual)
                      If False, email can be from any sender (OR)
                      
        Returns:
            Self for chaining
        """
        if not senders:
            return self
            
        if len(senders) == 1:
            self.criteria_parts.append(('from_', senders[0]))
        else:
            sender_conditions = [A(from_=sender) for sender in senders]
            if match_all:
                self.criteria_parts.append(('and_senders', sender_conditions))
            else:
                self.criteria_parts.append(('or_senders', sender_conditions))
                
        logger.debug(f"Added sender filters: {senders}")
        return self
        
    def add_flags(self, seen: Optional[bool] = None,
                  flagged: Optional[bool] = None,
                  answered: Optional[bool] = None,
                  draft: Optional[bool] = None,
                  deleted: Optional[bool] = None) -> 'SearchBuilder':
        """Add flag criteria.
        
        Args:
            seen: Filter by seen/unseen status
            flagged: Filter by flagged status
            answered: Filter by answered status
            draft: Filter by draft status
            deleted: Filter by deleted status
            
        Returns:
            Self for chaining
        """
        if seen is not None:
            self.criteria_parts.append(('seen', seen))
        if flagged is not None:
            self.criteria_parts.append(('flagged', flagged))
        if answered is not None:
            self.criteria_parts.append(('answered', answered))
        if draft is not None:
            self.criteria_parts.append(('draft', draft))
        if deleted is not None:
            self.criteria_parts.append(('deleted', deleted))
            
        return self
        
    def add_size_filters(self, size_min: Optional[int] = None,
                        size_max: Optional[int] = None) -> 'SearchBuilder':
        """Add size filters in bytes.
        
        Args:
            size_min: Minimum size in bytes
            size_max: Maximum size in bytes
            
        Returns:
            Self for chaining
        """
        if size_min is not None:
            self.criteria_parts.append(('size_gt', size_min))
            logger.debug(f"Added min size: {size_min} bytes")
            
        if size_max is not None:
            self.criteria_parts.append(('size_lt', size_max))
            logger.debug(f"Added max size: {size_max} bytes")
            
        return self
        
    def add_header(self, header_name: str, header_value: str) -> 'SearchBuilder':
        """Add custom header criteria.
        
        Args:
            header_name: Header name (e.g., 'X-Priority')
            header_value: Header value to match
            
        Returns:
            Self for chaining
        """
        self.criteria_parts.append(('header', H(header_name, header_value)))
        logger.debug(f"Added header: {header_name}={header_value}")
        return self
        
    def add_text_search(self, text: str, in_body: bool = True, 
                       in_subject: bool = False) -> 'SearchBuilder':
        """Add text search criteria.
        
        Args:
            text: Text to search for
            in_body: Search in email body
            in_subject: Search in subject line
            
        Returns:
            Self for chaining
        """
        conditions = []
        
        if in_body:
            conditions.append(A(text=text))
        if in_subject:
            conditions.append(A(subject=text))
            
        if len(conditions) == 1:
            self.criteria_parts.append(('text_search', conditions[0]))
        elif len(conditions) > 1:
            self.criteria_parts.append(('or_text', conditions))
            
        logger.debug(f"Added text search: '{text}' (body={in_body}, subject={in_subject})")
        return self
        
    def add_uid_range(self, uid_min: Optional[int] = None,
                     uid_max: Optional[int] = None) -> 'SearchBuilder':
        """Add UID range criteria.
        
        Args:
            uid_min: Minimum UID
            uid_max: Maximum UID
            
        Returns:
            Self for chaining
        """
        if uid_min is not None and uid_max is not None:
            self.criteria_parts.append(('uid', f'{uid_min}:{uid_max}'))
        elif uid_min is not None:
            self.criteria_parts.append(('uid', f'{uid_min}:*'))
        elif uid_max is not None:
            self.criteria_parts.append(('uid', f'1:{uid_max}'))
            
        return self
        
    def build(self) -> Union[str, A]:
        """Build the final search criteria.
        
        Returns:
            Search criteria for imap-tools
        """
        if not self.criteria_parts:
            return 'ALL'
            
        logger.info(f"SearchBuilder.build - 构建条件，parts: {self.criteria_parts}")
            
        # 处理不同类型的条件
        simple_criteria = {}
        complex_criteria = []
        
        for key, value in self.criteria_parts:
            if key in ['date_gte', 'date_lt', 'from_', 'subject', 
                      'seen', 'flagged', 'answered', 'draft', 'deleted',
                      'size_gt', 'size_lt', 'uid']:
                # 简单条件，可以直接作为 AND 的参数
                simple_criteria[key] = value
                
            elif key == 'not_subject':
                # NOT 条件
                complex_criteria.append(N(subject=value))
                
            elif key == 'or_subjects':
                # OR 条件（多个主题）
                complex_criteria.append(O(*value))
                
            elif key == 'and_subjects':
                # AND 条件（多个主题）
                for condition in value:
                    complex_criteria.append(condition)
                    
            elif key == 'or_senders':
                # OR 条件（多个发件人）
                complex_criteria.append(O(*value))
                
            elif key == 'and_senders':
                # AND 条件（多个发件人）
                for condition in value:
                    complex_criteria.append(condition)
                    
            elif key == 'header':
                # 头部条件
                complex_criteria.append(value)
                
            elif key == 'text_search':
                # 文本搜索
                complex_criteria.append(value)
                
            elif key == 'or_text':
                # OR 文本搜索
                complex_criteria.append(O(*value))
                
        # 组合所有条件
        result = None
        if simple_criteria and complex_criteria:
            # 既有简单条件又有复杂条件
            # 先将简单条件作为 A() 对象，然后与复杂条件组合
            base_condition = A(**simple_criteria)
            # 将基础条件和复杂条件合并
            all_conditions = [base_condition] + complex_criteria
            result = A(*all_conditions)
        elif simple_criteria:
            # 只有简单条件
            result = A(**simple_criteria)
        elif complex_criteria:
            # 只有复杂条件
            if len(complex_criteria) == 1:
                result = complex_criteria[0]
            else:
                result = A(*complex_criteria)
        else:
            result = 'ALL'
            
        logger.info(f"SearchBuilder.build - 最终搜索条件: {result}")
        return result
            
    def to_string(self) -> str:
        """Get string representation of current criteria.
        
        Returns:
            Human-readable criteria description
        """
        if not self.criteria_parts:
            return "ALL emails"
            
        parts = []
        for key, value in self.criteria_parts:
            if key == 'date_gte':
                parts.append(f"date >= {value}")
            elif key == 'date_lt':
                parts.append(f"date < {value}")
            elif key == 'from_':
                parts.append(f"from = {value}")
            elif key == 'subject':
                parts.append(f"subject contains '{value}'")
            elif key == 'not_subject':
                parts.append(f"subject not contains '{value}'")
            elif key == 'seen':
                parts.append("read" if value else "unread")
            elif key == 'flagged':
                parts.append("flagged" if value else "not flagged")
            elif key == 'size_gt':
                parts.append(f"size > {value} bytes")
            elif key == 'size_lt':
                parts.append(f"size < {value} bytes")
                
        return " AND ".join(parts)
        
    @classmethod
    def from_params(cls, params: Dict[str, Any]) -> 'SearchBuilder':
        """Create SearchBuilder from parameter dictionary.
        
        Args:
            params: Dictionary of search parameters
            
        Returns:
            Configured SearchBuilder instance
        """
        builder = cls()
        
        # 日期范围
        if params.get('date_from') or params.get('date_to'):
            builder.add_date_range(params.get('date_from'), params.get('date_to'))
            
        # 主题关键词
        if params.get('subject_keywords'):
            logger.info(f"SearchBuilder.from_params - 添加主题关键词: {params['subject_keywords']}")
            builder.add_subject_keywords(
                params['subject_keywords'],
                params.get('match_all_keywords', False)
            )
            
        # 排除关键词
        if params.get('exclude_keywords'):
            builder.add_exclude_keywords(params['exclude_keywords'])
            
        # 发件人
        if params.get('sender_filters'):
            builder.add_sender_filters(params['sender_filters'])
            
        # 标志
        if params.get('is_unread') is not None:
            builder.add_flags(seen=not params['is_unread'])
        if params.get('is_flagged') is not None:
            builder.add_flags(flagged=params['is_flagged'])
            
        # 大小
        if params.get('size_min') or params.get('size_max'):
            builder.add_size_filters(params.get('size_min'), params.get('size_max'))
            
        # UID范围
        if params.get('uid_min') or params.get('uid_max'):
            builder.add_uid_range(params.get('uid_min'), params.get('uid_max'))
            
        return builder