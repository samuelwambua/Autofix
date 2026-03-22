const { pool } = require('../config/db');

// ─── Get or Create Conversation ───────────────────────────
const getOrCreateConversation = async (req, res) => {
  try {
    const { garage_id, job_card_id } = req.body;
    const client_id = req.user.id;

    if (!garage_id)
      return res.status(400).json({ success: false, message: 'Please provide garage ID.' });

    // Check if conversation exists
    let result = await pool.query(
      `SELECT c.*, g.name AS garage_name, g.phone AS garage_phone
       FROM conversations c
       JOIN garages g ON c.garage_id = g.id
       WHERE c.client_id = $1 AND c.garage_id = $2`,
      [client_id, garage_id]
    );

    if (result.rows.length === 0) {
      // Create new conversation
      result = await pool.query(
        `INSERT INTO conversations (garage_id, client_id, job_card_id)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [garage_id, client_id, job_card_id || null]
      );
      const conv = result.rows[0];
      const garage = await pool.query('SELECT name, phone FROM garages WHERE id = $1', [garage_id]);
      result.rows[0].garage_name  = garage.rows[0]?.name;
      result.rows[0].garage_phone = garage.rows[0]?.phone;
    }

    return res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Get/Create Conversation Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── Get My Conversations (Client) ────────────────────────
const getMyConversations = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*,
              g.name AS garage_name, g.phone AS garage_phone,
              cl.first_name || ' ' || cl.last_name AS client_name,
              cl.phone AS client_phone
       FROM conversations c
       JOIN garages g ON c.garage_id = g.id
       JOIN clients cl ON c.client_id = cl.id
       WHERE c.client_id = $1
       ORDER BY c.last_message_at DESC NULLS LAST, c.created_at DESC`,
      [req.user.id]
    );
    return res.status(200).json({ success: true, count: result.rows.length, data: result.rows });
  } catch (error) {
    console.error('Get My Conversations Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── Get Garage Conversations (Staff) ─────────────────────
const getGarageConversations = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*,
              g.name AS garage_name,
              cl.first_name || ' ' || cl.last_name AS client_name,
              cl.phone AS client_phone, cl.email AS client_email
       FROM conversations c
       JOIN garages g ON c.garage_id = g.id
       JOIN clients cl ON c.client_id = cl.id
       WHERE c.garage_id = $1
       ORDER BY c.last_message_at DESC NULLS LAST, c.created_at DESC`,
      [req.garage_id]
    );
    return res.status(200).json({ success: true, count: result.rows.length, data: result.rows });
  } catch (error) {
    console.error('Get Garage Conversations Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── Get Messages for a Conversation ─────────────────────
const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const limit  = parseInt(req.query.limit) || 50;
    const before = req.query.before;

    // Verify access
    const conv = await pool.query('SELECT * FROM conversations WHERE id = $1', [conversationId]);
    if (conv.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Conversation not found.' });

    const c = conv.rows[0];
    if (req.user.role === 'client' && c.client_id !== req.user.id)
      return res.status(403).json({ success: false, message: 'Access denied.' });
    if (req.garage_id && c.garage_id !== req.garage_id)
      return res.status(403).json({ success: false, message: 'Access denied.' });

    const query = before
      ? `SELECT * FROM messages WHERE conversation_id = $1 AND created_at < $2
         ORDER BY created_at DESC LIMIT $3`
      : `SELECT * FROM messages WHERE conversation_id = $1
         ORDER BY created_at DESC LIMIT $2`;

    const params = before ? [conversationId, before, limit] : [conversationId, limit];
    const result = await pool.query(query, params);

    // Mark messages as read
    const senderType = req.user.role === 'client' ? 'staff' : 'client';
    await pool.query(
      `UPDATE messages SET is_read = TRUE
       WHERE conversation_id = $1 AND sender_type = $2 AND is_read = FALSE`,
      [conversationId, senderType]
    );

    // Reset unread count
    const unreadField = req.user.role === 'client' ? 'client_unread' : 'garage_unread';
    await pool.query(
      `UPDATE conversations SET ${unreadField} = 0 WHERE id = $1`, [conversationId]
    );

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows.reverse(), // oldest first
    });
  } catch (error) {
    console.error('Get Messages Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── Send Message (REST fallback) ─────────────────────────
const sendMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { content, message_type = 'text' } = req.body;

    if (!content)
      return res.status(400).json({ success: false, message: 'Message content is required.' });

    const conv = await pool.query('SELECT * FROM conversations WHERE id = $1', [conversationId]);
    if (conv.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Conversation not found.' });

    const c           = conv.rows[0];
    const sender_type = req.user.role === 'client' ? 'client' : 'staff';

    const message = await pool.query(
      `INSERT INTO messages (conversation_id, sender_id, sender_type, message_type, content)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [conversationId, req.user.id, sender_type, message_type, content]
    );

    // Update conversation last message + unread count
    const unreadField = sender_type === 'client' ? 'garage_unread' : 'client_unread';
    await pool.query(
      `UPDATE conversations SET last_message = $1, last_message_at = NOW(),
         ${unreadField} = ${unreadField} + 1, updated_at = NOW()
       WHERE id = $2`,
      [content.substring(0, 100), conversationId]
    );

    return res.status(201).json({ success: true, data: message.rows[0] });
  } catch (error) {
    console.error('Send Message Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── Get Total Unread Count ────────────────────────────────
const getUnreadCount = async (req, res) => {
  try {
    const isClient  = req.user.role === 'client';
    const field     = isClient ? 'client_unread' : 'garage_unread';
    const whereField = isClient ? 'client_id' : 'garage_id';
    const id        = isClient ? req.user.id : req.garage_id;

    const result = await pool.query(
      `SELECT COALESCE(SUM(${field}), 0) AS total_unread
       FROM conversations WHERE ${whereField} = $1`, [id]
    );
    return res.status(200).json({ success: true, data: { unread: parseInt(result.rows[0].total_unread) } });
  } catch (error) {
    console.error('Get Unread Count Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = {
  getOrCreateConversation, getMyConversations, getGarageConversations,
  getMessages, sendMessage, getUnreadCount,
};