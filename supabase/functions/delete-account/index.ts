// supabase/functions/delete-account/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing auth header' }), { status: 401 });
  }

  const userClient = createClient(
    Deno.env.get('SUPABASE_URL'),
    Deno.env.get('SUPABASE_ANON_KEY'),
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'Invalid session' }), { status: 401 });
  }

  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL'),
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  );

  // Order matters: scans references both patients and prediction_records,
  // so scans must be deleted before either of those to avoid FK violations
  // (unless those FKs are ON DELETE CASCADE, in which case this is still
  // safe, just redundant). Everything else here is a leaf table.
  const cleanupSteps = [
    { table: 'notifications',      column: 'user_id' },
    { table: 'aidebot_messages',   column: 'user_id' },
    { table: 'scans',              column: 'created_by' },
    { table: 'prediction_records', column: 'technician_id' },
    { table: 'patients',           column: 'created_by' },
    { table: 'profiles',           column: 'id' },
  ];

  for (const step of cleanupSteps) {
    const { error } = await adminClient
      .from(step.table)
      .delete()
      .eq(step.column, user.id);

    if (error) {
      return new Response(
        JSON.stringify({ error: `Failed to delete ${step.table}: ${error.message}` }),
        { status: 500 }
      );
    }
  }

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);
  if (deleteError) {
    return new Response(JSON.stringify({ error: deleteError.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
});