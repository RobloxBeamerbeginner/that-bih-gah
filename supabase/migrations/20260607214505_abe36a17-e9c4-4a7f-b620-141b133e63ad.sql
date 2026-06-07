
REVOKE ALL ON public.conversations FROM anon, authenticated;
REVOKE ALL ON public.chat_messages FROM anon, authenticated;

CREATE POLICY "Deny all client access to conversations"
  ON public.conversations FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

CREATE POLICY "Deny all client access to chat_messages"
  ON public.chat_messages FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

COMMENT ON TABLE public.conversations IS 'Server-only table. Accessed exclusively via server functions using the service role. Anonymous client_id is never trusted from the client; all reads/writes flow through server code that validates the request.';
COMMENT ON TABLE public.chat_messages IS 'Server-only table. Accessed exclusively via server functions using the service role.';
