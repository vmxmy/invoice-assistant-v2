"""优化版的高级搜索方法"""

def search_emails_advanced_optimized(self, 
                         date_from: Optional[datetime] = None,
                         date_to: Optional[datetime] = None,
                         subject_keywords: Optional[List[str]] = None,
                         exclude_keywords: Optional[List[str]] = None,
                         sender_filters: Optional[List[str]] = None,
                         max_results: Optional[int] = None) -> List[int]:
    """优化的高级邮件搜索 - 避免复杂 OR 条件导致的超时
    
    策略：
    1. 先应用日期过滤（通常能大幅减少结果集）
    2. 对多个关键词分别搜索，然后合并结果
    3. 最后在客户端进行排除过滤
    """
    if not self.mailbox:
        return []
        
    try:
        all_uids = set()  # 使用集合去重
        
        # 策略1：如果有主题关键词，分别搜索每个关键词
        if subject_keywords:
            for keyword in subject_keywords:
                logger.info(f"搜索主题包含 '{keyword}' 的邮件...")
                
                # 构建单个关键词的搜索条件
                conditions = []
                conditions.append(AND(subject=keyword))
                
                # 添加日期条件
                if date_from:
                    conditions.append(AND(date_gte=date_from.date()))
                if date_to:
                    conditions.append(AND(date_lt=date_to.date()))
                
                # 添加发件人条件（如果只有一个）
                if sender_filters and len(sender_filters) == 1:
                    conditions.append(AND(from_=sender_filters[0]))
                
                # 组合条件
                if len(conditions) > 1:
                    criteria = AND(*conditions)
                else:
                    criteria = conditions[0]
                
                # 执行搜索
                try:
                    if hasattr(self.mailbox, 'uids'):
                        uids = list(self.mailbox.uids(criteria, charset='UTF-8'))
                        all_uids.update(int(uid) for uid in uids)
                        logger.info(f"  找到 {len(uids)} 封邮件")
                except socket.timeout:
                    logger.warning(f"搜索 '{keyword}' 超时，跳过")
                    continue
        
        # 策略2：如果没有主题关键词，但有其他条件
        elif date_from or date_to or sender_filters:
            conditions = []
            
            if date_from:
                conditions.append(AND(date_gte=date_from.date()))
            if date_to:
                conditions.append(AND(date_lt=date_to.date()))
            
            # 如果有多个发件人，分别搜索
            if sender_filters and len(sender_filters) > 1:
                for sender in sender_filters:
                    sender_conditions = conditions.copy()
                    sender_conditions.append(AND(from_=sender))
                    
                    criteria = AND(*sender_conditions) if len(sender_conditions) > 1 else sender_conditions[0]
                    
                    try:
                        if hasattr(self.mailbox, 'uids'):
                            uids = list(self.mailbox.uids(criteria, charset='UTF-8'))
                            all_uids.update(int(uid) for uid in uids)
                    except socket.timeout:
                        logger.warning(f"搜索发件人 '{sender}' 超时，跳过")
                        continue
            else:
                # 单个发件人或无发件人条件
                if sender_filters:
                    conditions.append(AND(from_=sender_filters[0]))
                
                criteria = AND(*conditions) if len(conditions) > 1 else conditions[0]
                
                if hasattr(self.mailbox, 'uids'):
                    uids = list(self.mailbox.uids(criteria, charset='UTF-8'))
                    all_uids.update(int(uid) for uid in uids)
        
        # 转换为列表
        result_uids = list(all_uids)
        logger.info(f"合并后共找到 {len(result_uids)} 封不重复的邮件")
        
        # 客户端排除关键词过滤（如果需要）
        if exclude_keywords and result_uids:
            logger.info(f"开始排除关键词过滤...")
            filtered_uids = []
            
            # 批量处理，避免逐个获取
            batch_size = 50
            for i in range(0, len(result_uids), batch_size):
                batch_uids = result_uids[i:i+batch_size]
                
                for uid in batch_uids:
                    try:
                        # 获取邮件主题
                        found_msg = None
                        for msg in self.mailbox.fetch(AND(uid=str(uid)), mark_seen=False, limit=1):
                            found_msg = msg
                            break
                        
                        if found_msg:
                            subject = found_msg.subject or ''
                            
                            # 检查是否包含排除关键词
                            contains_exclude = any(
                                exclude_kw.lower() in subject.lower() 
                                for exclude_kw in exclude_keywords
                            )
                            
                            if not contains_exclude:
                                filtered_uids.append(uid)
                    except Exception as e:
                        logger.warning(f"处理 UID {uid} 时出错: {e}")
                        continue
            
            result_uids = filtered_uids
            logger.info(f"排除过滤后剩余 {len(result_uids)} 封邮件")
        
        # 限制结果数量
        if max_results and len(result_uids) > max_results:
            result_uids.sort(reverse=True)  # 新邮件在前
            result_uids = result_uids[:max_results]
            logger.info(f"限制结果为前 {max_results} 封邮件")
        
        return result_uids
        
    except Exception as e:
        logger.error(f"高级搜索失败: {str(e)}")
        return []