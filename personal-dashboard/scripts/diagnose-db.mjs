import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL, { prepare: false });

console.log('\n=== DB Diagnostic ===\n');

// Show all users
const users = await sql`SELECT id, email, name FROM users`;
console.log('Users table:');
if (users.length === 0) {
  console.log('  !! EMPTY — no user records. This means the signIn callback never ran successfully.');
} else {
  users.forEach(u => console.log(`  id="${u.id}"  email=${u.email}  name=${u.name}`));
}

// Show todos with their user_ids
const todos = await sql`SELECT id, user_id, text, done FROM todos ORDER BY created_at DESC LIMIT 20`;
console.log('\nTodos table (latest 20):');
if (todos.length === 0) {
  console.log('  EMPTY — no todos found at all.');
} else {
  todos.forEach(t => console.log(`  user_id="${t.user_id}"  done=${t.done}  text="${t.text}"`));
}

// Cross-check: todos whose user_id doesn't match any user
const orphaned = await sql`
  SELECT t.id, t.user_id, t.text
  FROM todos t
  LEFT JOIN users u ON u.id = t.user_id
  WHERE u.id IS NULL
`;
if (orphaned.length > 0) {
  console.log('\n!! ORPHANED TODOS (user_id has no matching user record):');
  orphaned.forEach(t => console.log(`  user_id="${t.user_id}"  text="${t.text}"`));
}

await sql.end();
