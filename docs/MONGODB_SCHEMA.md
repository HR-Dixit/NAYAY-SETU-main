# Nayay Setu MongoDB Schema

## Collections

### `users`
- `_id`
- `name`
- `email`
- `password`
- `role`
- `phone`
- `location`
- `createdAt`

Indexes:
- unique `email`
- compound `role + createdAt`
- `location`

### `lawyers`
- `_id`
- `name`
- `photo`
- `email`
- `phone`
- `specialization`
- `experience_years`
- `rating`
- `location`
- `languages`
- `availability_status`
- `response_time`
- `verified`
- `createdAt`

Indexes:
- unique `email`
- compound filter index on `specialization + location + rating + experience_years`
- compound assignment index on `verified + availability_status + response_time`
- text index on `name + specialization + location + languages`

### `case_requests`
- `_id`
- `user_id`
- `lawyer_id`
- `issue_description`
- `status`
- `createdAt`
- `assignedAt`
- `response_deadline`
- `reassignment_count`

Indexes:
- `lawyer_id + status + response_deadline`
- `user_id + createdAt`
- `status + response_deadline`

18-minute logic:
- `response_deadline` is set to `createdAt/assignedAt + 18 minutes`
- expired `pending` or `reassigned` requests can be reassigned to the next available verified lawyer with the best response profile

### `community_posts`
- `_id`
- `user_id`
- `title`
- `content`
- `tags`
- `upvotes`
- `createdAt`

Indexes:
- `user_id + createdAt`
- `tags + createdAt`
- text index on `title + content + tags`

### `comments`
- `_id`
- `post_id`
- `user_id`
- `comment_text`
- `createdAt`

Indexes:
- `post_id + createdAt`
- `user_id + createdAt`

## Implemented APIs

### `GET /api/lawyers`
Query params:
- `search`
- `specialization`
- `location`
- `language`
- `availability_status`
- `verified`
- `min_rating`
- `min_experience`
- `sort_by`
- `page`
- `limit`

### `GET /api/community/posts`
Query params:
- `search`
- `tag`
- `page`
- `limit`

### Support Utilities
- Mongo connection: `backend/server/db/mongoClient.js`
- Schema/index initializer: `backend/server/models/nayaySetuMongo.js`
- Lawyer filtering: `backend/server/routes/lawyerRoutes.js`
- Community post retrieval: `backend/server/routes/communityPostRoutes.js`
