--
-- PostgreSQL database dump
--

\restrict SVvz4L3GHksUosC5vCQA4nSx6E2MnRbHNK7CvC9sapv8ga7zlFNAYxYliSJptQA

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.0

-- Started on 2026-05-01 21:14:27

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

DROP POLICY IF EXISTS "users_own_transfers" ON "public"."transfers";
DROP POLICY IF EXISTS "Usuarios pueden ver sus propios pagos" ON "public"."credit_card_payments";
DROP POLICY IF EXISTS "Usuarios pueden insertar sus propios pagos" ON "public"."credit_card_payments";
DROP POLICY IF EXISTS "Users can view their own profile" ON "public"."users";
DROP POLICY IF EXISTS "Users can view their own incomes" ON "public"."monthly_incomes";
DROP POLICY IF EXISTS "Users can update their own profile" ON "public"."users";
DROP POLICY IF EXISTS "Users can manage their own subcategories" ON "public"."subcategories";
DROP POLICY IF EXISTS "Users can manage their own incomes" ON "public"."incomes";
DROP POLICY IF EXISTS "Users can manage their own fixed expenses" ON "public"."fixedexpenses";
DROP POLICY IF EXISTS "Users can manage their own expenses" ON "public"."expenses";
DROP POLICY IF EXISTS "Users can manage their own debts" ON "public"."debts";
DROP POLICY IF EXISTS "Users can manage their own categories" ON "public"."categories";
DROP POLICY IF EXISTS "Users can manage their own cards" ON "public"."cards";
DROP POLICY IF EXISTS "Users can manage their own budgets" ON "public"."budgets";
DROP POLICY IF EXISTS "Users can manage their own budget items" ON "public"."budgetitems";
DROP POLICY IF EXISTS "Users can insert their own incomes" ON "public"."monthly_incomes";
ALTER TABLE IF EXISTS ONLY "public"."transfers" DROP CONSTRAINT IF EXISTS "transfers_id_user_fkey";
ALTER TABLE IF EXISTS ONLY "public"."transfers" DROP CONSTRAINT IF EXISTS "transfers_id_to_fkey";
ALTER TABLE IF EXISTS ONLY "public"."transfers" DROP CONSTRAINT IF EXISTS "transfers_id_from_fkey";
ALTER TABLE IF EXISTS ONLY "public"."subcategories" DROP CONSTRAINT IF EXISTS "subcategories_id_user_fkey";
ALTER TABLE IF EXISTS ONLY "public"."subcategories" DROP CONSTRAINT IF EXISTS "subcategories_id_category_fkey";
ALTER TABLE IF EXISTS ONLY "public"."monthly_incomes" DROP CONSTRAINT IF EXISTS "monthly_incomes_id_user_fkey";
ALTER TABLE IF EXISTS ONLY "public"."monthly_incomes" DROP CONSTRAINT IF EXISTS "monthly_incomes_id_card_fkey";
ALTER TABLE IF EXISTS ONLY "public"."incomes" DROP CONSTRAINT IF EXISTS "incomes_id_user_fkey";
ALTER TABLE IF EXISTS ONLY "public"."incomes" DROP CONSTRAINT IF EXISTS "incomes_id_category_fkey";
ALTER TABLE IF EXISTS ONLY "public"."incomes" DROP CONSTRAINT IF EXISTS "incomes_id_card_fkey";
ALTER TABLE IF EXISTS ONLY "public"."fixedexpenses" DROP CONSTRAINT IF EXISTS "fixedexpenses_id_user_fkey";
ALTER TABLE IF EXISTS ONLY "public"."fixedexpenses" DROP CONSTRAINT IF EXISTS "fixedexpenses_id_subcat_fkey";
ALTER TABLE IF EXISTS ONLY "public"."fixedexpenses" DROP CONSTRAINT IF EXISTS "fixedexpenses_id_category_fkey";
ALTER TABLE IF EXISTS ONLY "public"."fixedexpenses" DROP CONSTRAINT IF EXISTS "fixedexpenses_id_card_fkey";
ALTER TABLE IF EXISTS ONLY "public"."expenses" DROP CONSTRAINT IF EXISTS "expenses_id_user_fkey";
ALTER TABLE IF EXISTS ONLY "public"."expenses" DROP CONSTRAINT IF EXISTS "expenses_id_subcat_fkey";
ALTER TABLE IF EXISTS ONLY "public"."expenses" DROP CONSTRAINT IF EXISTS "expenses_id_credit_payment_fkey";
ALTER TABLE IF EXISTS ONLY "public"."expenses" DROP CONSTRAINT IF EXISTS "expenses_id_category_fkey";
ALTER TABLE IF EXISTS ONLY "public"."expenses" DROP CONSTRAINT IF EXISTS "expenses_id_card_fkey";
ALTER TABLE IF EXISTS ONLY "public"."debts" DROP CONSTRAINT IF EXISTS "debts_id_user_fkey";
ALTER TABLE IF EXISTS ONLY "public"."credit_card_payments" DROP CONSTRAINT IF EXISTS "credit_card_payments_source_account_fkey";
ALTER TABLE IF EXISTS ONLY "public"."credit_card_payments" DROP CONSTRAINT IF EXISTS "credit_card_payments_id_user_fkey";
ALTER TABLE IF EXISTS ONLY "public"."credit_card_payments" DROP CONSTRAINT IF EXISTS "credit_card_payments_id_card_fkey";
ALTER TABLE IF EXISTS ONLY "public"."categories" DROP CONSTRAINT IF EXISTS "categories_id_user_fkey";
ALTER TABLE IF EXISTS ONLY "public"."cards" DROP CONSTRAINT IF EXISTS "cards_id_user_fkey";
ALTER TABLE IF EXISTS ONLY "public"."budgets" DROP CONSTRAINT IF EXISTS "budgets_id_user_fkey";
ALTER TABLE IF EXISTS ONLY "public"."budgets" DROP CONSTRAINT IF EXISTS "budgets_id_subcat_fkey";
ALTER TABLE IF EXISTS ONLY "public"."budgets" DROP CONSTRAINT IF EXISTS "budgets_id_category_fkey";
ALTER TABLE IF EXISTS ONLY "public"."budgetitems" DROP CONSTRAINT IF EXISTS "budgetitems_id_category_fkey";
ALTER TABLE IF EXISTS ONLY "public"."budgetitems" DROP CONSTRAINT IF EXISTS "budgetitems_id_budget_fkey";
ALTER TABLE IF EXISTS ONLY "auth"."webauthn_credentials" DROP CONSTRAINT IF EXISTS "webauthn_credentials_user_id_fkey";
ALTER TABLE IF EXISTS ONLY "auth"."webauthn_challenges" DROP CONSTRAINT IF EXISTS "webauthn_challenges_user_id_fkey";
ALTER TABLE IF EXISTS ONLY "auth"."sso_domains" DROP CONSTRAINT IF EXISTS "sso_domains_sso_provider_id_fkey";
ALTER TABLE IF EXISTS ONLY "auth"."sessions" DROP CONSTRAINT IF EXISTS "sessions_user_id_fkey";
ALTER TABLE IF EXISTS ONLY "auth"."sessions" DROP CONSTRAINT IF EXISTS "sessions_oauth_client_id_fkey";
ALTER TABLE IF EXISTS ONLY "auth"."saml_relay_states" DROP CONSTRAINT IF EXISTS "saml_relay_states_sso_provider_id_fkey";
ALTER TABLE IF EXISTS ONLY "auth"."saml_relay_states" DROP CONSTRAINT IF EXISTS "saml_relay_states_flow_state_id_fkey";
ALTER TABLE IF EXISTS ONLY "auth"."saml_providers" DROP CONSTRAINT IF EXISTS "saml_providers_sso_provider_id_fkey";
ALTER TABLE IF EXISTS ONLY "auth"."refresh_tokens" DROP CONSTRAINT IF EXISTS "refresh_tokens_session_id_fkey";
ALTER TABLE IF EXISTS ONLY "auth"."one_time_tokens" DROP CONSTRAINT IF EXISTS "one_time_tokens_user_id_fkey";
ALTER TABLE IF EXISTS ONLY "auth"."oauth_consents" DROP CONSTRAINT IF EXISTS "oauth_consents_user_id_fkey";
ALTER TABLE IF EXISTS ONLY "auth"."oauth_consents" DROP CONSTRAINT IF EXISTS "oauth_consents_client_id_fkey";
ALTER TABLE IF EXISTS ONLY "auth"."oauth_authorizations" DROP CONSTRAINT IF EXISTS "oauth_authorizations_user_id_fkey";
ALTER TABLE IF EXISTS ONLY "auth"."oauth_authorizations" DROP CONSTRAINT IF EXISTS "oauth_authorizations_client_id_fkey";
ALTER TABLE IF EXISTS ONLY "auth"."mfa_factors" DROP CONSTRAINT IF EXISTS "mfa_factors_user_id_fkey";
ALTER TABLE IF EXISTS ONLY "auth"."mfa_challenges" DROP CONSTRAINT IF EXISTS "mfa_challenges_auth_factor_id_fkey";
ALTER TABLE IF EXISTS ONLY "auth"."mfa_amr_claims" DROP CONSTRAINT IF EXISTS "mfa_amr_claims_session_id_fkey";
ALTER TABLE IF EXISTS ONLY "auth"."identities" DROP CONSTRAINT IF EXISTS "identities_user_id_fkey";
DROP TRIGGER IF EXISTS "on_auth_user_created" ON "auth"."users";
DROP INDEX IF EXISTS "auth"."webauthn_credentials_user_id_idx";
DROP INDEX IF EXISTS "auth"."webauthn_credentials_credential_id_key";
DROP INDEX IF EXISTS "auth"."webauthn_challenges_user_id_idx";
DROP INDEX IF EXISTS "auth"."webauthn_challenges_expires_at_idx";
DROP INDEX IF EXISTS "auth"."users_is_anonymous_idx";
DROP INDEX IF EXISTS "auth"."users_instance_id_idx";
DROP INDEX IF EXISTS "auth"."users_instance_id_email_idx";
DROP INDEX IF EXISTS "auth"."users_email_partial_key";
DROP INDEX IF EXISTS "auth"."user_id_created_at_idx";
DROP INDEX IF EXISTS "auth"."unique_phone_factor_per_user";
DROP INDEX IF EXISTS "auth"."sso_providers_resource_id_pattern_idx";
DROP INDEX IF EXISTS "auth"."sso_providers_resource_id_idx";
DROP INDEX IF EXISTS "auth"."sso_domains_sso_provider_id_idx";
DROP INDEX IF EXISTS "auth"."sso_domains_domain_idx";
DROP INDEX IF EXISTS "auth"."sessions_user_id_idx";
DROP INDEX IF EXISTS "auth"."sessions_oauth_client_id_idx";
DROP INDEX IF EXISTS "auth"."sessions_not_after_idx";
DROP INDEX IF EXISTS "auth"."saml_relay_states_sso_provider_id_idx";
DROP INDEX IF EXISTS "auth"."saml_relay_states_for_email_idx";
DROP INDEX IF EXISTS "auth"."saml_relay_states_created_at_idx";
DROP INDEX IF EXISTS "auth"."saml_providers_sso_provider_id_idx";
DROP INDEX IF EXISTS "auth"."refresh_tokens_updated_at_idx";
DROP INDEX IF EXISTS "auth"."refresh_tokens_session_id_revoked_idx";
DROP INDEX IF EXISTS "auth"."refresh_tokens_parent_idx";
DROP INDEX IF EXISTS "auth"."refresh_tokens_instance_id_user_id_idx";
DROP INDEX IF EXISTS "auth"."refresh_tokens_instance_id_idx";
DROP INDEX IF EXISTS "auth"."recovery_token_idx";
DROP INDEX IF EXISTS "auth"."reauthentication_token_idx";
DROP INDEX IF EXISTS "auth"."one_time_tokens_user_id_token_type_key";
DROP INDEX IF EXISTS "auth"."one_time_tokens_token_hash_hash_idx";
DROP INDEX IF EXISTS "auth"."one_time_tokens_relates_to_hash_idx";
DROP INDEX IF EXISTS "auth"."oauth_consents_user_order_idx";
DROP INDEX IF EXISTS "auth"."oauth_consents_active_user_client_idx";
DROP INDEX IF EXISTS "auth"."oauth_consents_active_client_idx";
DROP INDEX IF EXISTS "auth"."oauth_clients_deleted_at_idx";
DROP INDEX IF EXISTS "auth"."oauth_auth_pending_exp_idx";
DROP INDEX IF EXISTS "auth"."mfa_factors_user_id_idx";
DROP INDEX IF EXISTS "auth"."mfa_factors_user_friendly_name_unique";
DROP INDEX IF EXISTS "auth"."mfa_challenge_created_at_idx";
DROP INDEX IF EXISTS "auth"."idx_user_id_auth_method";
DROP INDEX IF EXISTS "auth"."idx_oauth_client_states_created_at";
DROP INDEX IF EXISTS "auth"."idx_auth_code";
DROP INDEX IF EXISTS "auth"."identities_user_id_idx";
DROP INDEX IF EXISTS "auth"."identities_email_idx";
DROP INDEX IF EXISTS "auth"."flow_state_created_at_idx";
DROP INDEX IF EXISTS "auth"."factor_id_created_at_idx";
DROP INDEX IF EXISTS "auth"."email_change_token_new_idx";
DROP INDEX IF EXISTS "auth"."email_change_token_current_idx";
DROP INDEX IF EXISTS "auth"."custom_oauth_providers_provider_type_idx";
DROP INDEX IF EXISTS "auth"."custom_oauth_providers_identifier_idx";
DROP INDEX IF EXISTS "auth"."custom_oauth_providers_enabled_idx";
DROP INDEX IF EXISTS "auth"."custom_oauth_providers_created_at_idx";
DROP INDEX IF EXISTS "auth"."confirmation_token_idx";
DROP INDEX IF EXISTS "auth"."audit_logs_instance_id_idx";
ALTER TABLE IF EXISTS ONLY "public"."users" DROP CONSTRAINT IF EXISTS "users_pkey";
ALTER TABLE IF EXISTS ONLY "public"."users" DROP CONSTRAINT IF EXISTS "users_name_user_key";
ALTER TABLE IF EXISTS ONLY "public"."users" DROP CONSTRAINT IF EXISTS "users_email_user_key";
ALTER TABLE IF EXISTS ONLY "public"."transfers" DROP CONSTRAINT IF EXISTS "transfers_pkey";
ALTER TABLE IF EXISTS ONLY "public"."subcategories" DROP CONSTRAINT IF EXISTS "subcategories_pkey";
ALTER TABLE IF EXISTS ONLY "public"."monthly_incomes" DROP CONSTRAINT IF EXISTS "monthly_incomes_pkey";
ALTER TABLE IF EXISTS ONLY "public"."incomes" DROP CONSTRAINT IF EXISTS "incomes_pkey";
ALTER TABLE IF EXISTS ONLY "public"."fixedexpenses" DROP CONSTRAINT IF EXISTS "fixedexpenses_pkey";
ALTER TABLE IF EXISTS ONLY "public"."expenses" DROP CONSTRAINT IF EXISTS "expenses_pkey";
ALTER TABLE IF EXISTS ONLY "public"."debts" DROP CONSTRAINT IF EXISTS "debts_pkey";
ALTER TABLE IF EXISTS ONLY "public"."credit_card_payments" DROP CONSTRAINT IF EXISTS "credit_card_payments_pkey";
ALTER TABLE IF EXISTS ONLY "public"."categories" DROP CONSTRAINT IF EXISTS "categories_pkey";
ALTER TABLE IF EXISTS ONLY "public"."cards" DROP CONSTRAINT IF EXISTS "cards_pkey";
ALTER TABLE IF EXISTS ONLY "public"."budgets" DROP CONSTRAINT IF EXISTS "budgets_pkey";
ALTER TABLE IF EXISTS ONLY "public"."budgetitems" DROP CONSTRAINT IF EXISTS "budgetitems_pkey";
ALTER TABLE IF EXISTS ONLY "auth"."webauthn_credentials" DROP CONSTRAINT IF EXISTS "webauthn_credentials_pkey";
ALTER TABLE IF EXISTS ONLY "auth"."webauthn_challenges" DROP CONSTRAINT IF EXISTS "webauthn_challenges_pkey";
ALTER TABLE IF EXISTS ONLY "auth"."users" DROP CONSTRAINT IF EXISTS "users_pkey";
ALTER TABLE IF EXISTS ONLY "auth"."users" DROP CONSTRAINT IF EXISTS "users_phone_key";
ALTER TABLE IF EXISTS ONLY "auth"."sso_providers" DROP CONSTRAINT IF EXISTS "sso_providers_pkey";
ALTER TABLE IF EXISTS ONLY "auth"."sso_domains" DROP CONSTRAINT IF EXISTS "sso_domains_pkey";
ALTER TABLE IF EXISTS ONLY "auth"."sessions" DROP CONSTRAINT IF EXISTS "sessions_pkey";
ALTER TABLE IF EXISTS ONLY "auth"."schema_migrations" DROP CONSTRAINT IF EXISTS "schema_migrations_pkey";
ALTER TABLE IF EXISTS ONLY "auth"."saml_relay_states" DROP CONSTRAINT IF EXISTS "saml_relay_states_pkey";
ALTER TABLE IF EXISTS ONLY "auth"."saml_providers" DROP CONSTRAINT IF EXISTS "saml_providers_pkey";
ALTER TABLE IF EXISTS ONLY "auth"."saml_providers" DROP CONSTRAINT IF EXISTS "saml_providers_entity_id_key";
ALTER TABLE IF EXISTS ONLY "auth"."refresh_tokens" DROP CONSTRAINT IF EXISTS "refresh_tokens_token_unique";
ALTER TABLE IF EXISTS ONLY "auth"."refresh_tokens" DROP CONSTRAINT IF EXISTS "refresh_tokens_pkey";
ALTER TABLE IF EXISTS ONLY "auth"."one_time_tokens" DROP CONSTRAINT IF EXISTS "one_time_tokens_pkey";
ALTER TABLE IF EXISTS ONLY "auth"."oauth_consents" DROP CONSTRAINT IF EXISTS "oauth_consents_user_client_unique";
ALTER TABLE IF EXISTS ONLY "auth"."oauth_consents" DROP CONSTRAINT IF EXISTS "oauth_consents_pkey";
ALTER TABLE IF EXISTS ONLY "auth"."oauth_clients" DROP CONSTRAINT IF EXISTS "oauth_clients_pkey";
ALTER TABLE IF EXISTS ONLY "auth"."oauth_client_states" DROP CONSTRAINT IF EXISTS "oauth_client_states_pkey";
ALTER TABLE IF EXISTS ONLY "auth"."oauth_authorizations" DROP CONSTRAINT IF EXISTS "oauth_authorizations_pkey";
ALTER TABLE IF EXISTS ONLY "auth"."oauth_authorizations" DROP CONSTRAINT IF EXISTS "oauth_authorizations_authorization_id_key";
ALTER TABLE IF EXISTS ONLY "auth"."oauth_authorizations" DROP CONSTRAINT IF EXISTS "oauth_authorizations_authorization_code_key";
ALTER TABLE IF EXISTS ONLY "auth"."mfa_factors" DROP CONSTRAINT IF EXISTS "mfa_factors_pkey";
ALTER TABLE IF EXISTS ONLY "auth"."mfa_factors" DROP CONSTRAINT IF EXISTS "mfa_factors_last_challenged_at_key";
ALTER TABLE IF EXISTS ONLY "auth"."mfa_challenges" DROP CONSTRAINT IF EXISTS "mfa_challenges_pkey";
ALTER TABLE IF EXISTS ONLY "auth"."mfa_amr_claims" DROP CONSTRAINT IF EXISTS "mfa_amr_claims_session_id_authentication_method_pkey";
ALTER TABLE IF EXISTS ONLY "auth"."instances" DROP CONSTRAINT IF EXISTS "instances_pkey";
ALTER TABLE IF EXISTS ONLY "auth"."identities" DROP CONSTRAINT IF EXISTS "identities_provider_id_provider_unique";
ALTER TABLE IF EXISTS ONLY "auth"."identities" DROP CONSTRAINT IF EXISTS "identities_pkey";
ALTER TABLE IF EXISTS ONLY "auth"."flow_state" DROP CONSTRAINT IF EXISTS "flow_state_pkey";
ALTER TABLE IF EXISTS ONLY "auth"."custom_oauth_providers" DROP CONSTRAINT IF EXISTS "custom_oauth_providers_pkey";
ALTER TABLE IF EXISTS ONLY "auth"."custom_oauth_providers" DROP CONSTRAINT IF EXISTS "custom_oauth_providers_identifier_key";
ALTER TABLE IF EXISTS ONLY "auth"."audit_log_entries" DROP CONSTRAINT IF EXISTS "audit_log_entries_pkey";
ALTER TABLE IF EXISTS ONLY "auth"."mfa_amr_claims" DROP CONSTRAINT IF EXISTS "amr_id_pk";
ALTER TABLE IF EXISTS "auth"."refresh_tokens" ALTER COLUMN "id" DROP DEFAULT;
DROP TABLE IF EXISTS "public"."users";
DROP TABLE IF EXISTS "public"."transfers";
DROP TABLE IF EXISTS "public"."subcategories";
DROP TABLE IF EXISTS "public"."monthly_incomes";
DROP TABLE IF EXISTS "public"."incomes";
DROP TABLE IF EXISTS "public"."fixedexpenses";
DROP TABLE IF EXISTS "public"."expenses";
DROP TABLE IF EXISTS "public"."debts";
DROP TABLE IF EXISTS "public"."credit_card_payments";
DROP TABLE IF EXISTS "public"."categories";
DROP TABLE IF EXISTS "public"."cards";
DROP TABLE IF EXISTS "public"."budgets";
DROP TABLE IF EXISTS "public"."budgetitems";
DROP TABLE IF EXISTS "auth"."webauthn_credentials";
DROP TABLE IF EXISTS "auth"."webauthn_challenges";
DROP TABLE IF EXISTS "auth"."users";
DROP TABLE IF EXISTS "auth"."sso_providers";
DROP TABLE IF EXISTS "auth"."sso_domains";
DROP TABLE IF EXISTS "auth"."sessions";
DROP TABLE IF EXISTS "auth"."schema_migrations";
DROP TABLE IF EXISTS "auth"."saml_relay_states";
DROP TABLE IF EXISTS "auth"."saml_providers";
DROP SEQUENCE IF EXISTS "auth"."refresh_tokens_id_seq";
DROP TABLE IF EXISTS "auth"."refresh_tokens";
DROP TABLE IF EXISTS "auth"."one_time_tokens";
DROP TABLE IF EXISTS "auth"."oauth_consents";
DROP TABLE IF EXISTS "auth"."oauth_clients";
DROP TABLE IF EXISTS "auth"."oauth_client_states";
DROP TABLE IF EXISTS "auth"."oauth_authorizations";
DROP TABLE IF EXISTS "auth"."mfa_factors";
DROP TABLE IF EXISTS "auth"."mfa_challenges";
DROP TABLE IF EXISTS "auth"."mfa_amr_claims";
DROP TABLE IF EXISTS "auth"."instances";
DROP TABLE IF EXISTS "auth"."identities";
DROP TABLE IF EXISTS "auth"."flow_state";
DROP TABLE IF EXISTS "auth"."custom_oauth_providers";
DROP TABLE IF EXISTS "auth"."audit_log_entries";
DROP FUNCTION IF EXISTS "public"."rls_auto_enable"();
DROP FUNCTION IF EXISTS "public"."handle_new_user"();
DROP FUNCTION IF EXISTS "auth"."uid"();
DROP FUNCTION IF EXISTS "auth"."role"();
DROP FUNCTION IF EXISTS "auth"."jwt"();
DROP FUNCTION IF EXISTS "auth"."email"();
DROP TYPE IF EXISTS "auth"."one_time_token_type";
DROP TYPE IF EXISTS "auth"."oauth_response_type";
DROP TYPE IF EXISTS "auth"."oauth_registration_type";
DROP TYPE IF EXISTS "auth"."oauth_client_type";
DROP TYPE IF EXISTS "auth"."oauth_authorization_status";
DROP TYPE IF EXISTS "auth"."factor_type";
DROP TYPE IF EXISTS "auth"."factor_status";
DROP TYPE IF EXISTS "auth"."code_challenge_method";
DROP TYPE IF EXISTS "auth"."aal_level";
DROP SCHEMA IF EXISTS "public";
DROP SCHEMA IF EXISTS "auth";
--
-- TOC entry 36 (class 2615 OID 16498)
-- Name: auth; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA "auth";


--
-- TOC entry 40 (class 2615 OID 2200)
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA "public";


--
-- TOC entry 4347 (class 0 OID 0)
-- Dependencies: 40
-- Name: SCHEMA "public"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA "public" IS 'standard public schema';


--
-- TOC entry 1160 (class 1247 OID 16738)
-- Name: aal_level; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE "auth"."aal_level" AS ENUM (
    'aal1',
    'aal2',
    'aal3'
);


--
-- TOC entry 1184 (class 1247 OID 16879)
-- Name: code_challenge_method; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE "auth"."code_challenge_method" AS ENUM (
    's256',
    'plain'
);


--
-- TOC entry 1157 (class 1247 OID 16732)
-- Name: factor_status; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE "auth"."factor_status" AS ENUM (
    'unverified',
    'verified'
);


--
-- TOC entry 1154 (class 1247 OID 16727)
-- Name: factor_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE "auth"."factor_type" AS ENUM (
    'totp',
    'webauthn',
    'phone'
);


--
-- TOC entry 1202 (class 1247 OID 16982)
-- Name: oauth_authorization_status; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE "auth"."oauth_authorization_status" AS ENUM (
    'pending',
    'approved',
    'denied',
    'expired'
);


--
-- TOC entry 1214 (class 1247 OID 17055)
-- Name: oauth_client_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE "auth"."oauth_client_type" AS ENUM (
    'public',
    'confidential'
);


--
-- TOC entry 1196 (class 1247 OID 16960)
-- Name: oauth_registration_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE "auth"."oauth_registration_type" AS ENUM (
    'dynamic',
    'manual'
);


--
-- TOC entry 1205 (class 1247 OID 16992)
-- Name: oauth_response_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE "auth"."oauth_response_type" AS ENUM (
    'code'
);


--
-- TOC entry 1190 (class 1247 OID 16921)
-- Name: one_time_token_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE "auth"."one_time_token_type" AS ENUM (
    'confirmation_token',
    'reauthentication_token',
    'recovery_token',
    'email_change_token_new',
    'email_change_token_current',
    'phone_change_token'
);


--
-- TOC entry 501 (class 1255 OID 16544)
-- Name: email(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION "auth"."email"() RETURNS "text"
    LANGUAGE "sql" STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.email', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')
  )::text
$$;


--
-- TOC entry 4348 (class 0 OID 0)
-- Dependencies: 501
-- Name: FUNCTION "email"(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION "auth"."email"() IS 'Deprecated. Use auth.jwt() -> ''email'' instead.';


--
-- TOC entry 494 (class 1255 OID 16709)
-- Name: jwt(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION "auth"."jwt"() RETURNS "jsonb"
    LANGUAGE "sql" STABLE
    AS $$
  select 
    coalesce(
        nullif(current_setting('request.jwt.claim', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')
    )::jsonb
$$;


--
-- TOC entry 499 (class 1255 OID 16543)
-- Name: role(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION "auth"."role"() RETURNS "text"
    LANGUAGE "sql" STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$$;


--
-- TOC entry 4349 (class 0 OID 0)
-- Dependencies: 499
-- Name: FUNCTION "role"(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION "auth"."role"() IS 'Deprecated. Use auth.jwt() -> ''role'' instead.';


--
-- TOC entry 506 (class 1255 OID 16542)
-- Name: uid(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION "auth"."uid"() RETURNS "uuid"
    LANGUAGE "sql" STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;


--
-- TOC entry 4350 (class 0 OID 0)
-- Dependencies: 506
-- Name: FUNCTION "uid"(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION "auth"."uid"() IS 'Deprecated. Use auth.jwt() -> ''sub'' instead.';


--
-- TOC entry 445 (class 1255 OID 17746)
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    cat_id UUID;
BEGIN
    -- 1. Insertar el perfil utilizando la metadata enviada desde el JS
    INSERT INTO public.Users (
        ID_USER, 
        NAME_USER, 
        FIRSTNAME_USER, 
        LASTNAME_USER, 
        EMAIL_USER, 
        PASSWORD_USER, 
        DATEBIRTH_USER,
        ROLE_USER
    )
    VALUES (
        NEW.id, 
        SPLIT_PART(NEW.email, '@', 1), 
        COALESCE(NEW.raw_user_meta_data->>'first_name', 'Nuevo'), 
        COALESCE(NEW.raw_user_meta_data->>'last_name', 'Usuario'), 
        NEW.email, 
        'external_auth', 
        COALESCE((NEW.raw_user_meta_data->>'birth_date')::date, '2000-01-01'), 
        'User'
    );

    -- 2. Compras (Tipo: Gasto)
    INSERT INTO public.Categories (ID_USER, NAME_CAT, GLOBAL_CAT, type_cat) 
    VALUES (NEW.id, 'Compras', TRUE, 'gasto') RETURNING ID_CAT INTO cat_id;
    INSERT INTO public.SubCategories (ID_CATEGORY, ID_USER, NAME_SUBCAT) VALUES
    (cat_id, NEW.id, 'Tienda'), (cat_id, NEW.id, 'Ropa'), (cat_id, NEW.id, 'Tecnología'),
    (cat_id, NEW.id, 'Delivery'), (cat_id, NEW.id, 'Comida'), (cat_id, NEW.id, 'Mascotas'), (cat_id, NEW.id, 'S - Otros');

    -- 3. Gastos Fijos (Tipo: Gasto)
    INSERT INTO public.Categories (ID_USER, NAME_CAT, GLOBAL_CAT, type_cat) 
    VALUES (NEW.id, 'Gastos Fijos', TRUE, 'gasto') RETURNING ID_CAT INTO cat_id;
    INSERT INTO public.SubCategories (ID_CATEGORY, ID_USER, NAME_SUBCAT) VALUES
    (cat_id, NEW.id, 'Spotify'), (cat_id, NEW.id, 'Gas'), (cat_id, NEW.id, 'Agua'),
    (cat_id, NEW.id, 'Internet'), (cat_id, NEW.id, 'Comida mascotas'), (cat_id, NEW.id, 'Celular'), (cat_id, NEW.id, 'G - Otros');

    -- 4. Formación (Tipo: Gasto)
    INSERT INTO public.Categories (ID_USER, NAME_CAT, GLOBAL_CAT, type_cat) 
    VALUES (NEW.id, 'Formación', TRUE, 'gasto') RETURNING ID_CAT INTO cat_id;
    INSERT INTO public.SubCategories (ID_CATEGORY, ID_USER, NAME_SUBCAT) VALUES
    (cat_id, NEW.id, 'Colegio'), (cat_id, NEW.id, 'Material escolar'), (cat_id, NEW.id, 'Libros'),
    (cat_id, NEW.id, 'Excursiones'), (cat_id, NEW.id, 'Cursos'), (cat_id, NEW.id, 'F - Otros');

    -- 5. Ocio (Tipo: Gasto)
    INSERT INTO public.Categories (ID_USER, NAME_CAT, GLOBAL_CAT, type_cat) 
    VALUES (NEW.id, 'Ocio', TRUE, 'gasto') RETURNING ID_CAT INTO cat_id;
    INSERT INTO public.SubCategories (ID_CATEGORY, ID_USER, NAME_SUBCAT) VALUES
    (cat_id, NEW.id, 'Vacaciones'), (cat_id, NEW.id, 'Paseos'), (cat_id, NEW.id, 'Juegos'),
    (cat_id, NEW.id, 'Deporte'), (cat_id, NEW.id, 'Restaurantes'), (cat_id, NEW.id, 'Bares'), (cat_id, NEW.id, 'O - Otros');

    -- 6. Transporte (Tipo: Gasto)
    INSERT INTO public.Categories (ID_USER, NAME_CAT, GLOBAL_CAT, type_cat) 
    VALUES (NEW.id, 'Transporte', TRUE, 'gasto') RETURNING ID_CAT INTO cat_id;
    INSERT INTO public.SubCategories (ID_CATEGORY, ID_USER, NAME_SUBCAT) VALUES
    (cat_id, NEW.id, 'Taxi'), (cat_id, NEW.id, 'Combi'), (cat_id, NEW.id, 'Trabajo'),
    (cat_id, NEW.id, 'Estudio'), (cat_id, NEW.id, 'T - Otros');

    -- 7. Vivienda (Tipo: Gasto)
    INSERT INTO public.Categories (ID_USER, NAME_CAT, GLOBAL_CAT, type_cat) 
    VALUES (NEW.id, 'Vivienda', TRUE, 'gasto') RETURNING ID_CAT INTO cat_id;
    INSERT INTO public.SubCategories (ID_CATEGORY, ID_USER, NAME_SUBCAT) VALUES
    (cat_id, NEW.id, 'Casa'), (cat_id, NEW.id, 'Electrodomésticos'), (cat_id, NEW.id, 'Reparaciones'),
    (cat_id, NEW.id, 'Muebles'), (cat_id, NEW.id, 'Decoración'), (cat_id, NEW.id, 'Limpieza'), (cat_id, NEW.id, 'V - Otros');

    -- 8. Salud (Tipo: Gasto)
    INSERT INTO public.Categories (ID_USER, NAME_CAT, GLOBAL_CAT, type_cat) 
    VALUES (NEW.id, 'Salud', TRUE, 'gasto') RETURNING ID_CAT INTO cat_id;
    INSERT INTO public.SubCategories (ID_CATEGORY, ID_USER, NAME_SUBCAT) VALUES
    (cat_id, NEW.id, 'Obra Social'), (cat_id, NEW.id, 'Farmacia'), (cat_id, NEW.id, 'Cuidado Personal'),
    (cat_id, NEW.id, 'Gimnasio'), (cat_id, NEW.id, 'Sa - Otros');

    -- 9. Seguros (Tipo: Gasto)
    INSERT INTO public.Categories (ID_USER, NAME_CAT, GLOBAL_CAT, type_cat) 
    VALUES (NEW.id, 'Seguros', TRUE, 'gasto') RETURNING ID_CAT INTO cat_id;
    INSERT INTO public.SubCategories (ID_CATEGORY, ID_USER, NAME_SUBCAT) VALUES
    (cat_id, NEW.id, 'Vivienda'), (cat_id, NEW.id, 'Jubilación'), (cat_id, NEW.id, 'Vehículo'),
    (cat_id, NEW.id, 'Vida'), (cat_id, NEW.id, 'Se - Otros');

    -- 10. Impuestos (Tipo: Gasto)
    INSERT INTO public.Categories (ID_USER, NAME_CAT, GLOBAL_CAT, type_cat) 
    VALUES (NEW.id, 'Impuestos', TRUE, 'gasto') RETURNING ID_CAT INTO cat_id;
    INSERT INTO public.SubCategories (ID_CATEGORY, ID_USER, NAME_SUBCAT) VALUES
    (cat_id, NEW.id, 'ABL'), (cat_id, NEW.id, 'Ingresos Brutos'), (cat_id, NEW.id, 'Riqueza'),
    (cat_id, NEW.id, 'Ganancias'), (cat_id, NEW.id, 'I - Otros');

    -- 11. Pago Tarjeta (Tipo: Gasto)
    INSERT INTO public.Categories (ID_USER, NAME_CAT, GLOBAL_CAT, type_cat) 
    VALUES (NEW.id, 'Pago Tarjeta', TRUE, 'gasto') RETURNING ID_CAT INTO cat_id;
    INSERT INTO public.SubCategories (ID_CATEGORY, ID_USER, NAME_SUBCAT) VALUES
    (cat_id, NEW.id, 'Credito');

    -- 12. INGRESOS (Nueva sección obligatoria)
    -- Insertamos categorías que Paulo verá en nuevoIngreso.html
    INSERT INTO public.Categories (ID_USER, NAME_CAT, GLOBAL_CAT, type_cat) 
    VALUES (NEW.id, 'Sueldo', TRUE, 'ingreso');
    
    INSERT INTO public.Categories (ID_USER, NAME_CAT, GLOBAL_CAT, type_cat) 
    VALUES (NEW.id, 'Ventas', TRUE, 'ingreso');
    
    INSERT INTO public.Categories (ID_USER, NAME_CAT, GLOBAL_CAT, type_cat) 
    VALUES (NEW.id, 'Otros Ingresos', TRUE, 'ingreso');

    -- 13. BILLETERA DE EFECTIVO
    -- Creamos automáticamente la cuenta de "Efectivo" con saldo 0
    INSERT INTO public.Cards (ID_USER, NAME_CARD, TYPE_CARD, CURRENT_BALANCE, DELETED_CARD) 
    VALUES (NEW.id,'Efectivo', 'Cash', 0.00, FALSE);

    -- 14. PRÉSTAMOS 
    -- Insertamos la categoría "Préstamos Realizados" para que el usuario pueda registrar los préstamos que le hacen a otros (Tipo: Gasto)
    -- Dentro de handle_new_user()
    INSERT INTO public.Categories (ID_USER, NAME_CAT, TYPE_CAT) 
    VALUES (NEW.id, 'Préstamos Realizados', 'gasto') 
    RETURNING ID_CAT INTO cat_id;

    INSERT INTO public.SubCategories (ID_CATEGORY, ID_USER, NAME_SUBCAT) 
    VALUES (cat_id, NEW.id, 'Préstamo');

    RETURN NEW;
END;
$$;


--
-- TOC entry 463 (class 1255 OID 17162)
-- Name: rls_auto_enable(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = "heap";

--
-- TOC entry 349 (class 1259 OID 16529)
-- Name: audit_log_entries; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE "auth"."audit_log_entries" (
    "instance_id" "uuid",
    "id" "uuid" NOT NULL,
    "payload" json,
    "created_at" timestamp with time zone,
    "ip_address" character varying(64) DEFAULT ''::character varying NOT NULL
);


--
-- TOC entry 4351 (class 0 OID 0)
-- Dependencies: 349
-- Name: TABLE "audit_log_entries"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE "auth"."audit_log_entries" IS 'Auth: Audit trail for user actions.';


--
-- TOC entry 368 (class 1259 OID 17078)
-- Name: custom_oauth_providers; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE "auth"."custom_oauth_providers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider_type" "text" NOT NULL,
    "identifier" "text" NOT NULL,
    "name" "text" NOT NULL,
    "client_id" "text" NOT NULL,
    "client_secret" "text" NOT NULL,
    "acceptable_client_ids" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "scopes" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "pkce_enabled" boolean DEFAULT true NOT NULL,
    "attribute_mapping" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "authorization_params" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "enabled" boolean DEFAULT true NOT NULL,
    "email_optional" boolean DEFAULT false NOT NULL,
    "issuer" "text",
    "discovery_url" "text",
    "skip_nonce_check" boolean DEFAULT false NOT NULL,
    "cached_discovery" "jsonb",
    "discovery_cached_at" timestamp with time zone,
    "authorization_url" "text",
    "token_url" "text",
    "userinfo_url" "text",
    "jwks_uri" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "custom_oauth_providers_authorization_url_https" CHECK ((("authorization_url" IS NULL) OR ("authorization_url" ~~ 'https://%'::"text"))),
    CONSTRAINT "custom_oauth_providers_authorization_url_length" CHECK ((("authorization_url" IS NULL) OR ("char_length"("authorization_url") <= 2048))),
    CONSTRAINT "custom_oauth_providers_client_id_length" CHECK ((("char_length"("client_id") >= 1) AND ("char_length"("client_id") <= 512))),
    CONSTRAINT "custom_oauth_providers_discovery_url_length" CHECK ((("discovery_url" IS NULL) OR ("char_length"("discovery_url") <= 2048))),
    CONSTRAINT "custom_oauth_providers_identifier_format" CHECK (("identifier" ~ '^[a-z0-9][a-z0-9:-]{0,48}[a-z0-9]$'::"text")),
    CONSTRAINT "custom_oauth_providers_issuer_length" CHECK ((("issuer" IS NULL) OR (("char_length"("issuer") >= 1) AND ("char_length"("issuer") <= 2048)))),
    CONSTRAINT "custom_oauth_providers_jwks_uri_https" CHECK ((("jwks_uri" IS NULL) OR ("jwks_uri" ~~ 'https://%'::"text"))),
    CONSTRAINT "custom_oauth_providers_jwks_uri_length" CHECK ((("jwks_uri" IS NULL) OR ("char_length"("jwks_uri") <= 2048))),
    CONSTRAINT "custom_oauth_providers_name_length" CHECK ((("char_length"("name") >= 1) AND ("char_length"("name") <= 100))),
    CONSTRAINT "custom_oauth_providers_oauth2_requires_endpoints" CHECK ((("provider_type" <> 'oauth2'::"text") OR (("authorization_url" IS NOT NULL) AND ("token_url" IS NOT NULL) AND ("userinfo_url" IS NOT NULL)))),
    CONSTRAINT "custom_oauth_providers_oidc_discovery_url_https" CHECK ((("provider_type" <> 'oidc'::"text") OR ("discovery_url" IS NULL) OR ("discovery_url" ~~ 'https://%'::"text"))),
    CONSTRAINT "custom_oauth_providers_oidc_issuer_https" CHECK ((("provider_type" <> 'oidc'::"text") OR ("issuer" IS NULL) OR ("issuer" ~~ 'https://%'::"text"))),
    CONSTRAINT "custom_oauth_providers_oidc_requires_issuer" CHECK ((("provider_type" <> 'oidc'::"text") OR ("issuer" IS NOT NULL))),
    CONSTRAINT "custom_oauth_providers_provider_type_check" CHECK (("provider_type" = ANY (ARRAY['oauth2'::"text", 'oidc'::"text"]))),
    CONSTRAINT "custom_oauth_providers_token_url_https" CHECK ((("token_url" IS NULL) OR ("token_url" ~~ 'https://%'::"text"))),
    CONSTRAINT "custom_oauth_providers_token_url_length" CHECK ((("token_url" IS NULL) OR ("char_length"("token_url") <= 2048))),
    CONSTRAINT "custom_oauth_providers_userinfo_url_https" CHECK ((("userinfo_url" IS NULL) OR ("userinfo_url" ~~ 'https://%'::"text"))),
    CONSTRAINT "custom_oauth_providers_userinfo_url_length" CHECK ((("userinfo_url" IS NULL) OR ("char_length"("userinfo_url") <= 2048)))
);


--
-- TOC entry 362 (class 1259 OID 16883)
-- Name: flow_state; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE "auth"."flow_state" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid",
    "auth_code" "text",
    "code_challenge_method" "auth"."code_challenge_method",
    "code_challenge" "text",
    "provider_type" "text" NOT NULL,
    "provider_access_token" "text",
    "provider_refresh_token" "text",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "authentication_method" "text" NOT NULL,
    "auth_code_issued_at" timestamp with time zone,
    "invite_token" "text",
    "referrer" "text",
    "oauth_client_state_id" "uuid",
    "linking_target_id" "uuid",
    "email_optional" boolean DEFAULT false NOT NULL
);


--
-- TOC entry 4352 (class 0 OID 0)
-- Dependencies: 362
-- Name: TABLE "flow_state"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE "auth"."flow_state" IS 'Stores metadata for all OAuth/SSO login flows';


--
-- TOC entry 353 (class 1259 OID 16681)
-- Name: identities; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE "auth"."identities" (
    "provider_id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "identity_data" "jsonb" NOT NULL,
    "provider" "text" NOT NULL,
    "last_sign_in_at" timestamp with time zone,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "email" "text" GENERATED ALWAYS AS ("lower"(("identity_data" ->> 'email'::"text"))) STORED,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);


--
-- TOC entry 4353 (class 0 OID 0)
-- Dependencies: 353
-- Name: TABLE "identities"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE "auth"."identities" IS 'Auth: Stores identities associated to a user.';


--
-- TOC entry 4354 (class 0 OID 0)
-- Dependencies: 353
-- Name: COLUMN "identities"."email"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN "auth"."identities"."email" IS 'Auth: Email is a generated column that references the optional email property in the identity_data';


--
-- TOC entry 348 (class 1259 OID 16522)
-- Name: instances; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE "auth"."instances" (
    "id" "uuid" NOT NULL,
    "uuid" "uuid",
    "raw_base_config" "text",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone
);


--
-- TOC entry 4355 (class 0 OID 0)
-- Dependencies: 348
-- Name: TABLE "instances"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE "auth"."instances" IS 'Auth: Manages users across multiple sites.';


--
-- TOC entry 357 (class 1259 OID 16770)
-- Name: mfa_amr_claims; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE "auth"."mfa_amr_claims" (
    "session_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL,
    "authentication_method" "text" NOT NULL,
    "id" "uuid" NOT NULL
);


--
-- TOC entry 4356 (class 0 OID 0)
-- Dependencies: 357
-- Name: TABLE "mfa_amr_claims"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE "auth"."mfa_amr_claims" IS 'auth: stores authenticator method reference claims for multi factor authentication';


--
-- TOC entry 356 (class 1259 OID 16758)
-- Name: mfa_challenges; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE "auth"."mfa_challenges" (
    "id" "uuid" NOT NULL,
    "factor_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "verified_at" timestamp with time zone,
    "ip_address" "inet" NOT NULL,
    "otp_code" "text",
    "web_authn_session_data" "jsonb"
);


--
-- TOC entry 4357 (class 0 OID 0)
-- Dependencies: 356
-- Name: TABLE "mfa_challenges"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE "auth"."mfa_challenges" IS 'auth: stores metadata about challenge requests made';


--
-- TOC entry 355 (class 1259 OID 16745)
-- Name: mfa_factors; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE "auth"."mfa_factors" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "friendly_name" "text",
    "factor_type" "auth"."factor_type" NOT NULL,
    "status" "auth"."factor_status" NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL,
    "secret" "text",
    "phone" "text",
    "last_challenged_at" timestamp with time zone,
    "web_authn_credential" "jsonb",
    "web_authn_aaguid" "uuid",
    "last_webauthn_challenge_data" "jsonb"
);


--
-- TOC entry 4358 (class 0 OID 0)
-- Dependencies: 355
-- Name: TABLE "mfa_factors"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE "auth"."mfa_factors" IS 'auth: stores metadata about factors';


--
-- TOC entry 4359 (class 0 OID 0)
-- Dependencies: 355
-- Name: COLUMN "mfa_factors"."last_webauthn_challenge_data"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN "auth"."mfa_factors"."last_webauthn_challenge_data" IS 'Stores the latest WebAuthn challenge data including attestation/assertion for customer verification';


--
-- TOC entry 365 (class 1259 OID 16995)
-- Name: oauth_authorizations; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE "auth"."oauth_authorizations" (
    "id" "uuid" NOT NULL,
    "authorization_id" "text" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "redirect_uri" "text" NOT NULL,
    "scope" "text" NOT NULL,
    "state" "text",
    "resource" "text",
    "code_challenge" "text",
    "code_challenge_method" "auth"."code_challenge_method",
    "response_type" "auth"."oauth_response_type" DEFAULT 'code'::"auth"."oauth_response_type" NOT NULL,
    "status" "auth"."oauth_authorization_status" DEFAULT 'pending'::"auth"."oauth_authorization_status" NOT NULL,
    "authorization_code" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '00:03:00'::interval) NOT NULL,
    "approved_at" timestamp with time zone,
    "nonce" "text",
    CONSTRAINT "oauth_authorizations_authorization_code_length" CHECK (("char_length"("authorization_code") <= 255)),
    CONSTRAINT "oauth_authorizations_code_challenge_length" CHECK (("char_length"("code_challenge") <= 128)),
    CONSTRAINT "oauth_authorizations_expires_at_future" CHECK (("expires_at" > "created_at")),
    CONSTRAINT "oauth_authorizations_nonce_length" CHECK (("char_length"("nonce") <= 255)),
    CONSTRAINT "oauth_authorizations_redirect_uri_length" CHECK (("char_length"("redirect_uri") <= 2048)),
    CONSTRAINT "oauth_authorizations_resource_length" CHECK (("char_length"("resource") <= 2048)),
    CONSTRAINT "oauth_authorizations_scope_length" CHECK (("char_length"("scope") <= 4096)),
    CONSTRAINT "oauth_authorizations_state_length" CHECK (("char_length"("state") <= 4096))
);


--
-- TOC entry 367 (class 1259 OID 17068)
-- Name: oauth_client_states; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE "auth"."oauth_client_states" (
    "id" "uuid" NOT NULL,
    "provider_type" "text" NOT NULL,
    "code_verifier" "text",
    "created_at" timestamp with time zone NOT NULL
);


--
-- TOC entry 4360 (class 0 OID 0)
-- Dependencies: 367
-- Name: TABLE "oauth_client_states"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE "auth"."oauth_client_states" IS 'Stores OAuth states for third-party provider authentication flows where Supabase acts as the OAuth client.';


--
-- TOC entry 364 (class 1259 OID 16965)
-- Name: oauth_clients; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE "auth"."oauth_clients" (
    "id" "uuid" NOT NULL,
    "client_secret_hash" "text",
    "registration_type" "auth"."oauth_registration_type" NOT NULL,
    "redirect_uris" "text" NOT NULL,
    "grant_types" "text" NOT NULL,
    "client_name" "text",
    "client_uri" "text",
    "logo_uri" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "client_type" "auth"."oauth_client_type" DEFAULT 'confidential'::"auth"."oauth_client_type" NOT NULL,
    "token_endpoint_auth_method" "text" NOT NULL,
    CONSTRAINT "oauth_clients_client_name_length" CHECK (("char_length"("client_name") <= 1024)),
    CONSTRAINT "oauth_clients_client_uri_length" CHECK (("char_length"("client_uri") <= 2048)),
    CONSTRAINT "oauth_clients_logo_uri_length" CHECK (("char_length"("logo_uri") <= 2048)),
    CONSTRAINT "oauth_clients_token_endpoint_auth_method_check" CHECK (("token_endpoint_auth_method" = ANY (ARRAY['client_secret_basic'::"text", 'client_secret_post'::"text", 'none'::"text"])))
);


--
-- TOC entry 366 (class 1259 OID 17028)
-- Name: oauth_consents; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE "auth"."oauth_consents" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "scopes" "text" NOT NULL,
    "granted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "revoked_at" timestamp with time zone,
    CONSTRAINT "oauth_consents_revoked_after_granted" CHECK ((("revoked_at" IS NULL) OR ("revoked_at" >= "granted_at"))),
    CONSTRAINT "oauth_consents_scopes_length" CHECK (("char_length"("scopes") <= 2048)),
    CONSTRAINT "oauth_consents_scopes_not_empty" CHECK (("char_length"(TRIM(BOTH FROM "scopes")) > 0))
);


--
-- TOC entry 363 (class 1259 OID 16933)
-- Name: one_time_tokens; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE "auth"."one_time_tokens" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "token_type" "auth"."one_time_token_type" NOT NULL,
    "token_hash" "text" NOT NULL,
    "relates_to" "text" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "one_time_tokens_token_hash_check" CHECK (("char_length"("token_hash") > 0))
);


--
-- TOC entry 347 (class 1259 OID 16511)
-- Name: refresh_tokens; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE "auth"."refresh_tokens" (
    "instance_id" "uuid",
    "id" bigint NOT NULL,
    "token" character varying(255),
    "user_id" character varying(255),
    "revoked" boolean,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "parent" character varying(255),
    "session_id" "uuid"
);


--
-- TOC entry 4361 (class 0 OID 0)
-- Dependencies: 347
-- Name: TABLE "refresh_tokens"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE "auth"."refresh_tokens" IS 'Auth: Store of tokens used to refresh JWT tokens once they expire.';


--
-- TOC entry 346 (class 1259 OID 16510)
-- Name: refresh_tokens_id_seq; Type: SEQUENCE; Schema: auth; Owner: -
--

CREATE SEQUENCE "auth"."refresh_tokens_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4362 (class 0 OID 0)
-- Dependencies: 346
-- Name: refresh_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: auth; Owner: -
--

ALTER SEQUENCE "auth"."refresh_tokens_id_seq" OWNED BY "auth"."refresh_tokens"."id";


--
-- TOC entry 360 (class 1259 OID 16812)
-- Name: saml_providers; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE "auth"."saml_providers" (
    "id" "uuid" NOT NULL,
    "sso_provider_id" "uuid" NOT NULL,
    "entity_id" "text" NOT NULL,
    "metadata_xml" "text" NOT NULL,
    "metadata_url" "text",
    "attribute_mapping" "jsonb",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "name_id_format" "text",
    CONSTRAINT "entity_id not empty" CHECK (("char_length"("entity_id") > 0)),
    CONSTRAINT "metadata_url not empty" CHECK ((("metadata_url" = NULL::"text") OR ("char_length"("metadata_url") > 0))),
    CONSTRAINT "metadata_xml not empty" CHECK (("char_length"("metadata_xml") > 0))
);


--
-- TOC entry 4363 (class 0 OID 0)
-- Dependencies: 360
-- Name: TABLE "saml_providers"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE "auth"."saml_providers" IS 'Auth: Manages SAML Identity Provider connections.';


--
-- TOC entry 361 (class 1259 OID 16830)
-- Name: saml_relay_states; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE "auth"."saml_relay_states" (
    "id" "uuid" NOT NULL,
    "sso_provider_id" "uuid" NOT NULL,
    "request_id" "text" NOT NULL,
    "for_email" "text",
    "redirect_to" "text",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "flow_state_id" "uuid",
    CONSTRAINT "request_id not empty" CHECK (("char_length"("request_id") > 0))
);


--
-- TOC entry 4364 (class 0 OID 0)
-- Dependencies: 361
-- Name: TABLE "saml_relay_states"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE "auth"."saml_relay_states" IS 'Auth: Contains SAML Relay State information for each Service Provider initiated login.';


--
-- TOC entry 350 (class 1259 OID 16537)
-- Name: schema_migrations; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE "auth"."schema_migrations" (
    "version" character varying(255) NOT NULL
);


--
-- TOC entry 4365 (class 0 OID 0)
-- Dependencies: 350
-- Name: TABLE "schema_migrations"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE "auth"."schema_migrations" IS 'Auth: Manages updates to the auth system.';


--
-- TOC entry 354 (class 1259 OID 16711)
-- Name: sessions; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE "auth"."sessions" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "factor_id" "uuid",
    "aal" "auth"."aal_level",
    "not_after" timestamp with time zone,
    "refreshed_at" timestamp without time zone,
    "user_agent" "text",
    "ip" "inet",
    "tag" "text",
    "oauth_client_id" "uuid",
    "refresh_token_hmac_key" "text",
    "refresh_token_counter" bigint,
    "scopes" "text",
    CONSTRAINT "sessions_scopes_length" CHECK (("char_length"("scopes") <= 4096))
);


--
-- TOC entry 4366 (class 0 OID 0)
-- Dependencies: 354
-- Name: TABLE "sessions"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE "auth"."sessions" IS 'Auth: Stores session data associated to a user.';


--
-- TOC entry 4367 (class 0 OID 0)
-- Dependencies: 354
-- Name: COLUMN "sessions"."not_after"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN "auth"."sessions"."not_after" IS 'Auth: Not after is a nullable column that contains a timestamp after which the session should be regarded as expired.';


--
-- TOC entry 4368 (class 0 OID 0)
-- Dependencies: 354
-- Name: COLUMN "sessions"."refresh_token_hmac_key"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN "auth"."sessions"."refresh_token_hmac_key" IS 'Holds a HMAC-SHA256 key used to sign refresh tokens for this session.';


--
-- TOC entry 4369 (class 0 OID 0)
-- Dependencies: 354
-- Name: COLUMN "sessions"."refresh_token_counter"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN "auth"."sessions"."refresh_token_counter" IS 'Holds the ID (counter) of the last issued refresh token.';


--
-- TOC entry 359 (class 1259 OID 16797)
-- Name: sso_domains; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE "auth"."sso_domains" (
    "id" "uuid" NOT NULL,
    "sso_provider_id" "uuid" NOT NULL,
    "domain" "text" NOT NULL,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    CONSTRAINT "domain not empty" CHECK (("char_length"("domain") > 0))
);


--
-- TOC entry 4370 (class 0 OID 0)
-- Dependencies: 359
-- Name: TABLE "sso_domains"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE "auth"."sso_domains" IS 'Auth: Manages SSO email address domain mapping to an SSO Identity Provider.';


--
-- TOC entry 358 (class 1259 OID 16788)
-- Name: sso_providers; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE "auth"."sso_providers" (
    "id" "uuid" NOT NULL,
    "resource_id" "text",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "disabled" boolean,
    CONSTRAINT "resource_id not empty" CHECK ((("resource_id" = NULL::"text") OR ("char_length"("resource_id") > 0)))
);


--
-- TOC entry 4371 (class 0 OID 0)
-- Dependencies: 358
-- Name: TABLE "sso_providers"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE "auth"."sso_providers" IS 'Auth: Manages SSO identity provider information; see saml_providers for SAML.';


--
-- TOC entry 4372 (class 0 OID 0)
-- Dependencies: 358
-- Name: COLUMN "sso_providers"."resource_id"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN "auth"."sso_providers"."resource_id" IS 'Auth: Uniquely identifies a SSO provider according to a user-chosen resource ID (case insensitive), useful in infrastructure as code.';


--
-- TOC entry 345 (class 1259 OID 16499)
-- Name: users; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE "auth"."users" (
    "instance_id" "uuid",
    "id" "uuid" NOT NULL,
    "aud" character varying(255),
    "role" character varying(255),
    "email" character varying(255),
    "encrypted_password" character varying(255),
    "email_confirmed_at" timestamp with time zone,
    "invited_at" timestamp with time zone,
    "confirmation_token" character varying(255),
    "confirmation_sent_at" timestamp with time zone,
    "recovery_token" character varying(255),
    "recovery_sent_at" timestamp with time zone,
    "email_change_token_new" character varying(255),
    "email_change" character varying(255),
    "email_change_sent_at" timestamp with time zone,
    "last_sign_in_at" timestamp with time zone,
    "raw_app_meta_data" "jsonb",
    "raw_user_meta_data" "jsonb",
    "is_super_admin" boolean,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "phone" "text" DEFAULT NULL::character varying,
    "phone_confirmed_at" timestamp with time zone,
    "phone_change" "text" DEFAULT ''::character varying,
    "phone_change_token" character varying(255) DEFAULT ''::character varying,
    "phone_change_sent_at" timestamp with time zone,
    "confirmed_at" timestamp with time zone GENERATED ALWAYS AS (LEAST("email_confirmed_at", "phone_confirmed_at")) STORED,
    "email_change_token_current" character varying(255) DEFAULT ''::character varying,
    "email_change_confirm_status" smallint DEFAULT 0,
    "banned_until" timestamp with time zone,
    "reauthentication_token" character varying(255) DEFAULT ''::character varying,
    "reauthentication_sent_at" timestamp with time zone,
    "is_sso_user" boolean DEFAULT false NOT NULL,
    "deleted_at" timestamp with time zone,
    "is_anonymous" boolean DEFAULT false NOT NULL,
    CONSTRAINT "users_email_change_confirm_status_check" CHECK ((("email_change_confirm_status" >= 0) AND ("email_change_confirm_status" <= 2)))
);


--
-- TOC entry 4373 (class 0 OID 0)
-- Dependencies: 345
-- Name: TABLE "users"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE "auth"."users" IS 'Auth: Stores user login data within a secure schema.';


--
-- TOC entry 4374 (class 0 OID 0)
-- Dependencies: 345
-- Name: COLUMN "users"."is_sso_user"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN "auth"."users"."is_sso_user" IS 'Auth: Set this column to true when the account comes from SSO. These accounts can have duplicate emails.';


--
-- TOC entry 370 (class 1259 OID 17143)
-- Name: webauthn_challenges; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE "auth"."webauthn_challenges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "challenge_type" "text" NOT NULL,
    "session_data" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    CONSTRAINT "webauthn_challenges_challenge_type_check" CHECK (("challenge_type" = ANY (ARRAY['signup'::"text", 'registration'::"text", 'authentication'::"text"])))
);


--
-- TOC entry 369 (class 1259 OID 17120)
-- Name: webauthn_credentials; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE "auth"."webauthn_credentials" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "credential_id" "bytea" NOT NULL,
    "public_key" "bytea" NOT NULL,
    "attestation_type" "text" DEFAULT ''::"text" NOT NULL,
    "aaguid" "uuid",
    "sign_count" bigint DEFAULT 0 NOT NULL,
    "transports" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "backup_eligible" boolean DEFAULT false NOT NULL,
    "backed_up" boolean DEFAULT false NOT NULL,
    "friendly_name" "text" DEFAULT ''::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_used_at" timestamp with time zone
);


--
-- TOC entry 392 (class 1259 OID 17658)
-- Name: budgetitems; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."budgetitems" (
    "id_item" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "id_budget" "uuid" NOT NULL,
    "id_category" "uuid" NOT NULL,
    "limit_item" numeric(15,2) NOT NULL,
    "deleted_item" boolean DEFAULT false NOT NULL,
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- TOC entry 391 (class 1259 OID 17642)
-- Name: budgets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."budgets" (
    "id_budget" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "id_user" "uuid" NOT NULL,
    "name_budget" character varying(75) NOT NULL,
    "month_budget" smallint NOT NULL,
    "year_budget" smallint NOT NULL,
    "total_budget" numeric(15,2) NOT NULL,
    "currency_budget" character varying(3) DEFAULT 'PEN'::character varying NOT NULL,
    "deleted_budget" boolean DEFAULT false NOT NULL,
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "id_category" "uuid",
    "id_subcat" "uuid",
    CONSTRAINT "budgets_month_budget_check" CHECK ((("month_budget" >= 1) AND ("month_budget" <= 12)))
);


--
-- TOC entry 387 (class 1259 OID 17552)
-- Name: cards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."cards" (
    "id_card" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "id_user" "uuid" NOT NULL,
    "name_card" character varying(50) NOT NULL,
    "type_card" character varying(10) NOT NULL,
    "currency" character varying(3) DEFAULT 'PEN'::character varying NOT NULL,
    "limit_card" numeric(15,2),
    "cutoff_day" smallint,
    "due_day" smallint,
    "deleted_card" boolean DEFAULT false NOT NULL,
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "tea_card" numeric(5,2) DEFAULT 0.00,
    "current_balance" numeric(15,2) DEFAULT 0.00,
    CONSTRAINT "cards_cutoff_day_check" CHECK ((("cutoff_day" >= 1) AND ("cutoff_day" <= 31))),
    CONSTRAINT "cards_due_day_check" CHECK ((("due_day" >= 1) AND ("due_day" <= 31))),
    CONSTRAINT "cards_type_card_check" CHECK ((("type_card")::"text" = ANY ((ARRAY['Debit'::character varying, 'Credit'::character varying, 'Cash'::character varying])::"text"[])))
);


--
-- TOC entry 4375 (class 0 OID 0)
-- Dependencies: 387
-- Name: COLUMN "cards"."current_balance"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."cards"."current_balance" IS 'Saldo real disponible (Débito/Cash) o Deuda acumulada (Crédito)';


--
-- TOC entry 388 (class 1259 OID 17570)
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."categories" (
    "id_cat" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "id_user" "uuid" NOT NULL,
    "name_cat" character varying(50) NOT NULL,
    "global_cat" boolean DEFAULT false NOT NULL,
    "deleted_cat" boolean DEFAULT false NOT NULL,
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "type_cat" "text" DEFAULT 'gasto'::"text",
    CONSTRAINT "check_type" CHECK (("type_cat" = ANY (ARRAY['gasto'::"text", 'ingreso'::"text"])))
);


--
-- TOC entry 397 (class 1259 OID 19159)
-- Name: credit_card_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."credit_card_payments" (
    "id_payment" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "id_user" "uuid",
    "id_card" "uuid",
    "amount_paid" numeric(15,2) NOT NULL,
    "date_payment" "date" DEFAULT CURRENT_DATE,
    "source_account" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "notes" "text",
    "month_cycle" smallint,
    "year_cycle" smallint,
    "payment_type" "text" DEFAULT 'abono'::"text",
    "target_cycle" "text" DEFAULT 'previous'::"text",
    CONSTRAINT "credit_card_payments_payment_type_check" CHECK (("payment_type" = ANY (ARRAY['abono'::"text", 'total'::"text"]))),
    CONSTRAINT "credit_card_payments_target_cycle_check" CHECK (("target_cycle" = ANY (ARRAY['current'::"text", 'previous'::"text"])))
);


--
-- TOC entry 4376 (class 0 OID 0)
-- Dependencies: 397
-- Name: COLUMN "credit_card_payments"."month_cycle"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."credit_card_payments"."month_cycle" IS 'Mes del ciclo de facturación al que se atribuye el pago (1-12)';


--
-- TOC entry 394 (class 1259 OID 17711)
-- Name: debts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."debts" (
    "id_debt" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "id_user" "uuid" NOT NULL,
    "debtor_name" character varying(100) NOT NULL,
    "description_debt" character varying(500) NOT NULL,
    "amount_debt" numeric(15,2) NOT NULL,
    "amount_paid" numeric(15,2) DEFAULT 0 NOT NULL,
    "currency_debt" character varying(3) DEFAULT 'PEN'::character varying NOT NULL,
    "date_debt" "date" NOT NULL,
    "due_date_debt" "date",
    "status_debt" character varying(10) DEFAULT 'Pending'::character varying NOT NULL,
    "deleted_debt" boolean DEFAULT false NOT NULL,
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "debts_status_debt_check" CHECK ((("status_debt")::"text" = ANY ((ARRAY['Pending'::character varying, 'Partial'::character varying, 'Paid'::character varying])::"text"[])))
);


--
-- TOC entry 390 (class 1259 OID 17605)
-- Name: expenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."expenses" (
    "id_exp" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "id_category" "uuid" NOT NULL,
    "id_subcat" "uuid" NOT NULL,
    "id_user" "uuid" NOT NULL,
    "id_card" "uuid",
    "date_exp" "date" NOT NULL,
    "description_exp" character varying(500) NOT NULL,
    "amount_exp" numeric(15,2) NOT NULL,
    "currency_exp" character varying(3) DEFAULT 'PEN'::character varying NOT NULL,
    "payment_method" character varying(10) DEFAULT 'Cash'::character varying NOT NULL,
    "installments" smallint DEFAULT 1 NOT NULL,
    "installment_amt" numeric(15,2),
    "deleted_exp" boolean DEFAULT false NOT NULL,
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "installments_total" smallint DEFAULT 1,
    "installments_paid" smallint DEFAULT 0,
    "exclude_from_balance" boolean DEFAULT false,
    "id_credit_payment" "uuid",
    CONSTRAINT "chk_creditneedscard" CHECK ((((("payment_method")::"text" = 'Credit'::"text") AND ("id_card" IS NOT NULL)) OR (("payment_method")::"text" <> 'Credit'::"text"))),
    CONSTRAINT "chk_installmentsamount" CHECK (((("installments" > 1) AND ("installment_amt" IS NOT NULL)) OR ("installments" = 1))),
    CONSTRAINT "expenses_payment_method_check" CHECK ((("payment_method")::"text" = ANY ((ARRAY['Cash'::character varying, 'Debit'::character varying, 'Credit'::character varying])::"text"[])))
);


--
-- TOC entry 393 (class 1259 OID 17677)
-- Name: fixedexpenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."fixedexpenses" (
    "id_fixed" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "id_user" "uuid" NOT NULL,
    "id_category" "uuid" NOT NULL,
    "id_subcat" "uuid",
    "id_card" "uuid",
    "name_fixed" character varying(100) NOT NULL,
    "amount_fixed" numeric(15,2) NOT NULL,
    "currency_fixed" character varying(3) DEFAULT 'PEN'::character varying NOT NULL,
    "day_fixed" smallint NOT NULL,
    "frequency_fixed" character varying(15) DEFAULT 'Monthly'::character varying NOT NULL,
    "active_fixed" boolean DEFAULT true NOT NULL,
    "deleted_fixed" boolean DEFAULT false NOT NULL,
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "fixedexpenses_day_fixed_check" CHECK ((("day_fixed" >= 1) AND ("day_fixed" <= 31))),
    CONSTRAINT "fixedexpenses_frequency_fixed_check" CHECK ((("frequency_fixed")::"text" = ANY ((ARRAY['Weekly'::character varying, 'Monthly'::character varying, 'Yearly'::character varying])::"text"[])))
);


--
-- TOC entry 395 (class 1259 OID 17899)
-- Name: incomes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."incomes" (
    "id_inc" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "id_user" "uuid",
    "amount_inc" numeric(15,2) NOT NULL,
    "date_inc" "date" DEFAULT CURRENT_DATE,
    "id_category" "uuid",
    "payment_method" "text",
    "id_card" "uuid",
    "description_inc" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "incomes_payment_method_check" CHECK (("payment_method" = ANY (ARRAY['Cash'::"text", 'Debit'::"text"])))
);


--
-- TOC entry 396 (class 1259 OID 17954)
-- Name: monthly_incomes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."monthly_incomes" (
    "id_income" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "id_user" "uuid" NOT NULL,
    "month_income" smallint,
    "year_income" smallint,
    "amount_income" numeric(15,2) NOT NULL,
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "date_income" "date" DEFAULT CURRENT_DATE,
    "id_card" "uuid",
    "notes_income" "text"
);


--
-- TOC entry 389 (class 1259 OID 17585)
-- Name: subcategories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."subcategories" (
    "id_subcat" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "id_category" "uuid" NOT NULL,
    "id_user" "uuid" NOT NULL,
    "name_subcat" character varying(50) NOT NULL,
    "global_subcat" boolean DEFAULT false NOT NULL,
    "deleted_subcat" boolean DEFAULT false NOT NULL,
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- TOC entry 398 (class 1259 OID 21525)
-- Name: transfers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."transfers" (
    "id_transfer" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "id_user" "uuid",
    "id_from" "uuid",
    "id_to" "uuid",
    "amount" numeric(15,2) NOT NULL,
    "date_transfer" "date" DEFAULT CURRENT_DATE NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


--
-- TOC entry 386 (class 1259 OID 17536)
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."users" (
    "id_user" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name_user" character varying(50) NOT NULL,
    "firstname_user" character varying(50) NOT NULL,
    "lastname_user" character varying(75) NOT NULL,
    "role_user" character varying(25) DEFAULT 'User'::character varying NOT NULL,
    "email_user" character varying(255) NOT NULL,
    "password_user" character varying(255) NOT NULL,
    "datebirth_user" "date" NOT NULL,
    "image_user" character varying(255),
    "deleted_user" boolean DEFAULT false NOT NULL,
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- TOC entry 3748 (class 2604 OID 16514)
-- Name: refresh_tokens id; Type: DEFAULT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."refresh_tokens" ALTER COLUMN "id" SET DEFAULT "nextval"('"auth"."refresh_tokens_id_seq"'::"regclass");


--
-- TOC entry 3965 (class 2606 OID 16783)
-- Name: mfa_amr_claims amr_id_pk; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."mfa_amr_claims"
    ADD CONSTRAINT "amr_id_pk" PRIMARY KEY ("id");


--
-- TOC entry 3937 (class 2606 OID 16535)
-- Name: audit_log_entries audit_log_entries_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."audit_log_entries"
    ADD CONSTRAINT "audit_log_entries_pkey" PRIMARY KEY ("id");


--
-- TOC entry 4020 (class 2606 OID 17115)
-- Name: custom_oauth_providers custom_oauth_providers_identifier_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."custom_oauth_providers"
    ADD CONSTRAINT "custom_oauth_providers_identifier_key" UNIQUE ("identifier");


--
-- TOC entry 4022 (class 2606 OID 17113)
-- Name: custom_oauth_providers custom_oauth_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."custom_oauth_providers"
    ADD CONSTRAINT "custom_oauth_providers_pkey" PRIMARY KEY ("id");


--
-- TOC entry 3988 (class 2606 OID 16889)
-- Name: flow_state flow_state_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."flow_state"
    ADD CONSTRAINT "flow_state_pkey" PRIMARY KEY ("id");


--
-- TOC entry 3943 (class 2606 OID 16907)
-- Name: identities identities_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."identities"
    ADD CONSTRAINT "identities_pkey" PRIMARY KEY ("id");


--
-- TOC entry 3945 (class 2606 OID 16917)
-- Name: identities identities_provider_id_provider_unique; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."identities"
    ADD CONSTRAINT "identities_provider_id_provider_unique" UNIQUE ("provider_id", "provider");


--
-- TOC entry 3935 (class 2606 OID 16528)
-- Name: instances instances_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."instances"
    ADD CONSTRAINT "instances_pkey" PRIMARY KEY ("id");


--
-- TOC entry 3967 (class 2606 OID 16776)
-- Name: mfa_amr_claims mfa_amr_claims_session_id_authentication_method_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."mfa_amr_claims"
    ADD CONSTRAINT "mfa_amr_claims_session_id_authentication_method_pkey" UNIQUE ("session_id", "authentication_method");


--
-- TOC entry 3963 (class 2606 OID 16764)
-- Name: mfa_challenges mfa_challenges_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."mfa_challenges"
    ADD CONSTRAINT "mfa_challenges_pkey" PRIMARY KEY ("id");


--
-- TOC entry 3955 (class 2606 OID 16957)
-- Name: mfa_factors mfa_factors_last_challenged_at_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."mfa_factors"
    ADD CONSTRAINT "mfa_factors_last_challenged_at_key" UNIQUE ("last_challenged_at");


--
-- TOC entry 3957 (class 2606 OID 16751)
-- Name: mfa_factors mfa_factors_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."mfa_factors"
    ADD CONSTRAINT "mfa_factors_pkey" PRIMARY KEY ("id");


--
-- TOC entry 4001 (class 2606 OID 17016)
-- Name: oauth_authorizations oauth_authorizations_authorization_code_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."oauth_authorizations"
    ADD CONSTRAINT "oauth_authorizations_authorization_code_key" UNIQUE ("authorization_code");


--
-- TOC entry 4003 (class 2606 OID 17014)
-- Name: oauth_authorizations oauth_authorizations_authorization_id_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."oauth_authorizations"
    ADD CONSTRAINT "oauth_authorizations_authorization_id_key" UNIQUE ("authorization_id");


--
-- TOC entry 4005 (class 2606 OID 17012)
-- Name: oauth_authorizations oauth_authorizations_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."oauth_authorizations"
    ADD CONSTRAINT "oauth_authorizations_pkey" PRIMARY KEY ("id");


--
-- TOC entry 4015 (class 2606 OID 17074)
-- Name: oauth_client_states oauth_client_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."oauth_client_states"
    ADD CONSTRAINT "oauth_client_states_pkey" PRIMARY KEY ("id");


--
-- TOC entry 3998 (class 2606 OID 16976)
-- Name: oauth_clients oauth_clients_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."oauth_clients"
    ADD CONSTRAINT "oauth_clients_pkey" PRIMARY KEY ("id");


--
-- TOC entry 4009 (class 2606 OID 17038)
-- Name: oauth_consents oauth_consents_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."oauth_consents"
    ADD CONSTRAINT "oauth_consents_pkey" PRIMARY KEY ("id");


--
-- TOC entry 4011 (class 2606 OID 17040)
-- Name: oauth_consents oauth_consents_user_client_unique; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."oauth_consents"
    ADD CONSTRAINT "oauth_consents_user_client_unique" UNIQUE ("user_id", "client_id");


--
-- TOC entry 3992 (class 2606 OID 16942)
-- Name: one_time_tokens one_time_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."one_time_tokens"
    ADD CONSTRAINT "one_time_tokens_pkey" PRIMARY KEY ("id");


--
-- TOC entry 3929 (class 2606 OID 16518)
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."refresh_tokens"
    ADD CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id");


--
-- TOC entry 3932 (class 2606 OID 16694)
-- Name: refresh_tokens refresh_tokens_token_unique; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."refresh_tokens"
    ADD CONSTRAINT "refresh_tokens_token_unique" UNIQUE ("token");


--
-- TOC entry 3977 (class 2606 OID 16823)
-- Name: saml_providers saml_providers_entity_id_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."saml_providers"
    ADD CONSTRAINT "saml_providers_entity_id_key" UNIQUE ("entity_id");


--
-- TOC entry 3979 (class 2606 OID 16821)
-- Name: saml_providers saml_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."saml_providers"
    ADD CONSTRAINT "saml_providers_pkey" PRIMARY KEY ("id");


--
-- TOC entry 3984 (class 2606 OID 16837)
-- Name: saml_relay_states saml_relay_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."saml_relay_states"
    ADD CONSTRAINT "saml_relay_states_pkey" PRIMARY KEY ("id");


--
-- TOC entry 3940 (class 2606 OID 16541)
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."schema_migrations"
    ADD CONSTRAINT "schema_migrations_pkey" PRIMARY KEY ("version");


--
-- TOC entry 3950 (class 2606 OID 16715)
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."sessions"
    ADD CONSTRAINT "sessions_pkey" PRIMARY KEY ("id");


--
-- TOC entry 3974 (class 2606 OID 16804)
-- Name: sso_domains sso_domains_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."sso_domains"
    ADD CONSTRAINT "sso_domains_pkey" PRIMARY KEY ("id");


--
-- TOC entry 3969 (class 2606 OID 16795)
-- Name: sso_providers sso_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."sso_providers"
    ADD CONSTRAINT "sso_providers_pkey" PRIMARY KEY ("id");


--
-- TOC entry 3922 (class 2606 OID 16877)
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."users"
    ADD CONSTRAINT "users_phone_key" UNIQUE ("phone");


--
-- TOC entry 3924 (class 2606 OID 16505)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");


--
-- TOC entry 4030 (class 2606 OID 17152)
-- Name: webauthn_challenges webauthn_challenges_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."webauthn_challenges"
    ADD CONSTRAINT "webauthn_challenges_pkey" PRIMARY KEY ("id");


--
-- TOC entry 4026 (class 2606 OID 17135)
-- Name: webauthn_credentials webauthn_credentials_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."webauthn_credentials"
    ADD CONSTRAINT "webauthn_credentials_pkey" PRIMARY KEY ("id");


--
-- TOC entry 4049 (class 2606 OID 17666)
-- Name: budgetitems budgetitems_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."budgetitems"
    ADD CONSTRAINT "budgetitems_pkey" PRIMARY KEY ("id_item");


--
-- TOC entry 4047 (class 2606 OID 17652)
-- Name: budgets budgets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."budgets"
    ADD CONSTRAINT "budgets_pkey" PRIMARY KEY ("id_budget");


--
-- TOC entry 4039 (class 2606 OID 17564)
-- Name: cards cards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."cards"
    ADD CONSTRAINT "cards_pkey" PRIMARY KEY ("id_card");


--
-- TOC entry 4041 (class 2606 OID 17579)
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id_cat");


--
-- TOC entry 4059 (class 2606 OID 19166)
-- Name: credit_card_payments credit_card_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."credit_card_payments"
    ADD CONSTRAINT "credit_card_payments_pkey" PRIMARY KEY ("id_payment");


--
-- TOC entry 4053 (class 2606 OID 17725)
-- Name: debts debts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."debts"
    ADD CONSTRAINT "debts_pkey" PRIMARY KEY ("id_debt");


--
-- TOC entry 4045 (class 2606 OID 17621)
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_pkey" PRIMARY KEY ("id_exp");


--
-- TOC entry 4051 (class 2606 OID 17690)
-- Name: fixedexpenses fixedexpenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."fixedexpenses"
    ADD CONSTRAINT "fixedexpenses_pkey" PRIMARY KEY ("id_fixed");


--
-- TOC entry 4055 (class 2606 OID 17909)
-- Name: incomes incomes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."incomes"
    ADD CONSTRAINT "incomes_pkey" PRIMARY KEY ("id_inc");


--
-- TOC entry 4057 (class 2606 OID 17960)
-- Name: monthly_incomes monthly_incomes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."monthly_incomes"
    ADD CONSTRAINT "monthly_incomes_pkey" PRIMARY KEY ("id_income");


--
-- TOC entry 4043 (class 2606 OID 17594)
-- Name: subcategories subcategories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."subcategories"
    ADD CONSTRAINT "subcategories_pkey" PRIMARY KEY ("id_subcat");


--
-- TOC entry 4061 (class 2606 OID 21534)
-- Name: transfers transfers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."transfers"
    ADD CONSTRAINT "transfers_pkey" PRIMARY KEY ("id_transfer");


--
-- TOC entry 4033 (class 2606 OID 17551)
-- Name: users users_email_user_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_user_key" UNIQUE ("email_user");


--
-- TOC entry 4035 (class 2606 OID 17549)
-- Name: users users_name_user_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_name_user_key" UNIQUE ("name_user");


--
-- TOC entry 4037 (class 2606 OID 17547)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id_user");


--
-- TOC entry 3938 (class 1259 OID 16536)
-- Name: audit_logs_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "audit_logs_instance_id_idx" ON "auth"."audit_log_entries" USING "btree" ("instance_id");


--
-- TOC entry 3912 (class 1259 OID 16704)
-- Name: confirmation_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX "confirmation_token_idx" ON "auth"."users" USING "btree" ("confirmation_token") WHERE (("confirmation_token")::"text" !~ '^[0-9 ]*$'::"text");


--
-- TOC entry 4016 (class 1259 OID 17119)
-- Name: custom_oauth_providers_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "custom_oauth_providers_created_at_idx" ON "auth"."custom_oauth_providers" USING "btree" ("created_at");


--
-- TOC entry 4017 (class 1259 OID 17118)
-- Name: custom_oauth_providers_enabled_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "custom_oauth_providers_enabled_idx" ON "auth"."custom_oauth_providers" USING "btree" ("enabled");


--
-- TOC entry 4018 (class 1259 OID 17116)
-- Name: custom_oauth_providers_identifier_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "custom_oauth_providers_identifier_idx" ON "auth"."custom_oauth_providers" USING "btree" ("identifier");


--
-- TOC entry 4023 (class 1259 OID 17117)
-- Name: custom_oauth_providers_provider_type_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "custom_oauth_providers_provider_type_idx" ON "auth"."custom_oauth_providers" USING "btree" ("provider_type");


--
-- TOC entry 3913 (class 1259 OID 16706)
-- Name: email_change_token_current_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX "email_change_token_current_idx" ON "auth"."users" USING "btree" ("email_change_token_current") WHERE (("email_change_token_current")::"text" !~ '^[0-9 ]*$'::"text");


--
-- TOC entry 3914 (class 1259 OID 16707)
-- Name: email_change_token_new_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX "email_change_token_new_idx" ON "auth"."users" USING "btree" ("email_change_token_new") WHERE (("email_change_token_new")::"text" !~ '^[0-9 ]*$'::"text");


--
-- TOC entry 3953 (class 1259 OID 16785)
-- Name: factor_id_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "factor_id_created_at_idx" ON "auth"."mfa_factors" USING "btree" ("user_id", "created_at");


--
-- TOC entry 3986 (class 1259 OID 16893)
-- Name: flow_state_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "flow_state_created_at_idx" ON "auth"."flow_state" USING "btree" ("created_at" DESC);


--
-- TOC entry 3941 (class 1259 OID 16873)
-- Name: identities_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "identities_email_idx" ON "auth"."identities" USING "btree" ("email" "text_pattern_ops");


--
-- TOC entry 4378 (class 0 OID 0)
-- Dependencies: 3941
-- Name: INDEX "identities_email_idx"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON INDEX "auth"."identities_email_idx" IS 'Auth: Ensures indexed queries on the email column';


--
-- TOC entry 3946 (class 1259 OID 16701)
-- Name: identities_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "identities_user_id_idx" ON "auth"."identities" USING "btree" ("user_id");


--
-- TOC entry 3989 (class 1259 OID 16890)
-- Name: idx_auth_code; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "idx_auth_code" ON "auth"."flow_state" USING "btree" ("auth_code");


--
-- TOC entry 4013 (class 1259 OID 17075)
-- Name: idx_oauth_client_states_created_at; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "idx_oauth_client_states_created_at" ON "auth"."oauth_client_states" USING "btree" ("created_at");


--
-- TOC entry 3990 (class 1259 OID 16891)
-- Name: idx_user_id_auth_method; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "idx_user_id_auth_method" ON "auth"."flow_state" USING "btree" ("user_id", "authentication_method");


--
-- TOC entry 3961 (class 1259 OID 16896)
-- Name: mfa_challenge_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "mfa_challenge_created_at_idx" ON "auth"."mfa_challenges" USING "btree" ("created_at" DESC);


--
-- TOC entry 3958 (class 1259 OID 16757)
-- Name: mfa_factors_user_friendly_name_unique; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX "mfa_factors_user_friendly_name_unique" ON "auth"."mfa_factors" USING "btree" ("friendly_name", "user_id") WHERE (TRIM(BOTH FROM "friendly_name") <> ''::"text");


--
-- TOC entry 3959 (class 1259 OID 16902)
-- Name: mfa_factors_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "mfa_factors_user_id_idx" ON "auth"."mfa_factors" USING "btree" ("user_id");


--
-- TOC entry 3999 (class 1259 OID 17027)
-- Name: oauth_auth_pending_exp_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "oauth_auth_pending_exp_idx" ON "auth"."oauth_authorizations" USING "btree" ("expires_at") WHERE ("status" = 'pending'::"auth"."oauth_authorization_status");


--
-- TOC entry 3996 (class 1259 OID 16980)
-- Name: oauth_clients_deleted_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "oauth_clients_deleted_at_idx" ON "auth"."oauth_clients" USING "btree" ("deleted_at");


--
-- TOC entry 4006 (class 1259 OID 17053)
-- Name: oauth_consents_active_client_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "oauth_consents_active_client_idx" ON "auth"."oauth_consents" USING "btree" ("client_id") WHERE ("revoked_at" IS NULL);


--
-- TOC entry 4007 (class 1259 OID 17051)
-- Name: oauth_consents_active_user_client_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "oauth_consents_active_user_client_idx" ON "auth"."oauth_consents" USING "btree" ("user_id", "client_id") WHERE ("revoked_at" IS NULL);


--
-- TOC entry 4012 (class 1259 OID 17052)
-- Name: oauth_consents_user_order_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "oauth_consents_user_order_idx" ON "auth"."oauth_consents" USING "btree" ("user_id", "granted_at" DESC);


--
-- TOC entry 3993 (class 1259 OID 16949)
-- Name: one_time_tokens_relates_to_hash_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "one_time_tokens_relates_to_hash_idx" ON "auth"."one_time_tokens" USING "hash" ("relates_to");


--
-- TOC entry 3994 (class 1259 OID 16948)
-- Name: one_time_tokens_token_hash_hash_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "one_time_tokens_token_hash_hash_idx" ON "auth"."one_time_tokens" USING "hash" ("token_hash");


--
-- TOC entry 3995 (class 1259 OID 16950)
-- Name: one_time_tokens_user_id_token_type_key; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX "one_time_tokens_user_id_token_type_key" ON "auth"."one_time_tokens" USING "btree" ("user_id", "token_type");


--
-- TOC entry 3915 (class 1259 OID 16708)
-- Name: reauthentication_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX "reauthentication_token_idx" ON "auth"."users" USING "btree" ("reauthentication_token") WHERE (("reauthentication_token")::"text" !~ '^[0-9 ]*$'::"text");


--
-- TOC entry 3916 (class 1259 OID 16705)
-- Name: recovery_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX "recovery_token_idx" ON "auth"."users" USING "btree" ("recovery_token") WHERE (("recovery_token")::"text" !~ '^[0-9 ]*$'::"text");


--
-- TOC entry 3925 (class 1259 OID 16519)
-- Name: refresh_tokens_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "refresh_tokens_instance_id_idx" ON "auth"."refresh_tokens" USING "btree" ("instance_id");


--
-- TOC entry 3926 (class 1259 OID 16520)
-- Name: refresh_tokens_instance_id_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "refresh_tokens_instance_id_user_id_idx" ON "auth"."refresh_tokens" USING "btree" ("instance_id", "user_id");


--
-- TOC entry 3927 (class 1259 OID 16700)
-- Name: refresh_tokens_parent_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "refresh_tokens_parent_idx" ON "auth"."refresh_tokens" USING "btree" ("parent");


--
-- TOC entry 3930 (class 1259 OID 16787)
-- Name: refresh_tokens_session_id_revoked_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "refresh_tokens_session_id_revoked_idx" ON "auth"."refresh_tokens" USING "btree" ("session_id", "revoked");


--
-- TOC entry 3933 (class 1259 OID 16892)
-- Name: refresh_tokens_updated_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "refresh_tokens_updated_at_idx" ON "auth"."refresh_tokens" USING "btree" ("updated_at" DESC);


--
-- TOC entry 3980 (class 1259 OID 16829)
-- Name: saml_providers_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "saml_providers_sso_provider_id_idx" ON "auth"."saml_providers" USING "btree" ("sso_provider_id");


--
-- TOC entry 3981 (class 1259 OID 16894)
-- Name: saml_relay_states_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "saml_relay_states_created_at_idx" ON "auth"."saml_relay_states" USING "btree" ("created_at" DESC);


--
-- TOC entry 3982 (class 1259 OID 16844)
-- Name: saml_relay_states_for_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "saml_relay_states_for_email_idx" ON "auth"."saml_relay_states" USING "btree" ("for_email");


--
-- TOC entry 3985 (class 1259 OID 16843)
-- Name: saml_relay_states_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "saml_relay_states_sso_provider_id_idx" ON "auth"."saml_relay_states" USING "btree" ("sso_provider_id");


--
-- TOC entry 3947 (class 1259 OID 16895)
-- Name: sessions_not_after_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "sessions_not_after_idx" ON "auth"."sessions" USING "btree" ("not_after" DESC);


--
-- TOC entry 3948 (class 1259 OID 17065)
-- Name: sessions_oauth_client_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "sessions_oauth_client_id_idx" ON "auth"."sessions" USING "btree" ("oauth_client_id");


--
-- TOC entry 3951 (class 1259 OID 16786)
-- Name: sessions_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "sessions_user_id_idx" ON "auth"."sessions" USING "btree" ("user_id");


--
-- TOC entry 3972 (class 1259 OID 16811)
-- Name: sso_domains_domain_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX "sso_domains_domain_idx" ON "auth"."sso_domains" USING "btree" ("lower"("domain"));


--
-- TOC entry 3975 (class 1259 OID 16810)
-- Name: sso_domains_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "sso_domains_sso_provider_id_idx" ON "auth"."sso_domains" USING "btree" ("sso_provider_id");


--
-- TOC entry 3970 (class 1259 OID 16796)
-- Name: sso_providers_resource_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX "sso_providers_resource_id_idx" ON "auth"."sso_providers" USING "btree" ("lower"("resource_id"));


--
-- TOC entry 3971 (class 1259 OID 16958)
-- Name: sso_providers_resource_id_pattern_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "sso_providers_resource_id_pattern_idx" ON "auth"."sso_providers" USING "btree" ("resource_id" "text_pattern_ops");


--
-- TOC entry 3960 (class 1259 OID 16955)
-- Name: unique_phone_factor_per_user; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX "unique_phone_factor_per_user" ON "auth"."mfa_factors" USING "btree" ("user_id", "phone");


--
-- TOC entry 3952 (class 1259 OID 16784)
-- Name: user_id_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "user_id_created_at_idx" ON "auth"."sessions" USING "btree" ("user_id", "created_at");


--
-- TOC entry 3917 (class 1259 OID 16864)
-- Name: users_email_partial_key; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX "users_email_partial_key" ON "auth"."users" USING "btree" ("email") WHERE ("is_sso_user" = false);


--
-- TOC entry 4379 (class 0 OID 0)
-- Dependencies: 3917
-- Name: INDEX "users_email_partial_key"; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON INDEX "auth"."users_email_partial_key" IS 'Auth: A partial unique index that applies only when is_sso_user is false';


--
-- TOC entry 3918 (class 1259 OID 16702)
-- Name: users_instance_id_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "users_instance_id_email_idx" ON "auth"."users" USING "btree" ("instance_id", "lower"(("email")::"text"));


--
-- TOC entry 3919 (class 1259 OID 16509)
-- Name: users_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "users_instance_id_idx" ON "auth"."users" USING "btree" ("instance_id");


--
-- TOC entry 3920 (class 1259 OID 16919)
-- Name: users_is_anonymous_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "users_is_anonymous_idx" ON "auth"."users" USING "btree" ("is_anonymous");


--
-- TOC entry 4028 (class 1259 OID 17159)
-- Name: webauthn_challenges_expires_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "webauthn_challenges_expires_at_idx" ON "auth"."webauthn_challenges" USING "btree" ("expires_at");


--
-- TOC entry 4031 (class 1259 OID 17158)
-- Name: webauthn_challenges_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "webauthn_challenges_user_id_idx" ON "auth"."webauthn_challenges" USING "btree" ("user_id");


--
-- TOC entry 4024 (class 1259 OID 17141)
-- Name: webauthn_credentials_credential_id_key; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX "webauthn_credentials_credential_id_key" ON "auth"."webauthn_credentials" USING "btree" ("credential_id");


--
-- TOC entry 4027 (class 1259 OID 17142)
-- Name: webauthn_credentials_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "webauthn_credentials_user_id_idx" ON "auth"."webauthn_credentials" USING "btree" ("user_id");


--
-- TOC entry 4110 (class 2620 OID 17747)
-- Name: users on_auth_user_created; Type: TRIGGER; Schema: auth; Owner: -
--

CREATE TRIGGER "on_auth_user_created" AFTER INSERT ON "auth"."users" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_user"();


--
-- TOC entry 4063 (class 2606 OID 16688)
-- Name: identities identities_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."identities"
    ADD CONSTRAINT "identities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- TOC entry 4068 (class 2606 OID 16777)
-- Name: mfa_amr_claims mfa_amr_claims_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."mfa_amr_claims"
    ADD CONSTRAINT "mfa_amr_claims_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "auth"."sessions"("id") ON DELETE CASCADE;


--
-- TOC entry 4067 (class 2606 OID 16765)
-- Name: mfa_challenges mfa_challenges_auth_factor_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."mfa_challenges"
    ADD CONSTRAINT "mfa_challenges_auth_factor_id_fkey" FOREIGN KEY ("factor_id") REFERENCES "auth"."mfa_factors"("id") ON DELETE CASCADE;


--
-- TOC entry 4066 (class 2606 OID 16752)
-- Name: mfa_factors mfa_factors_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."mfa_factors"
    ADD CONSTRAINT "mfa_factors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- TOC entry 4074 (class 2606 OID 17017)
-- Name: oauth_authorizations oauth_authorizations_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."oauth_authorizations"
    ADD CONSTRAINT "oauth_authorizations_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "auth"."oauth_clients"("id") ON DELETE CASCADE;


--
-- TOC entry 4075 (class 2606 OID 17022)
-- Name: oauth_authorizations oauth_authorizations_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."oauth_authorizations"
    ADD CONSTRAINT "oauth_authorizations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- TOC entry 4076 (class 2606 OID 17046)
-- Name: oauth_consents oauth_consents_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."oauth_consents"
    ADD CONSTRAINT "oauth_consents_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "auth"."oauth_clients"("id") ON DELETE CASCADE;


--
-- TOC entry 4077 (class 2606 OID 17041)
-- Name: oauth_consents oauth_consents_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."oauth_consents"
    ADD CONSTRAINT "oauth_consents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- TOC entry 4073 (class 2606 OID 16943)
-- Name: one_time_tokens one_time_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."one_time_tokens"
    ADD CONSTRAINT "one_time_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- TOC entry 4062 (class 2606 OID 16721)
-- Name: refresh_tokens refresh_tokens_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."refresh_tokens"
    ADD CONSTRAINT "refresh_tokens_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "auth"."sessions"("id") ON DELETE CASCADE;


--
-- TOC entry 4070 (class 2606 OID 16824)
-- Name: saml_providers saml_providers_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."saml_providers"
    ADD CONSTRAINT "saml_providers_sso_provider_id_fkey" FOREIGN KEY ("sso_provider_id") REFERENCES "auth"."sso_providers"("id") ON DELETE CASCADE;


--
-- TOC entry 4071 (class 2606 OID 16897)
-- Name: saml_relay_states saml_relay_states_flow_state_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."saml_relay_states"
    ADD CONSTRAINT "saml_relay_states_flow_state_id_fkey" FOREIGN KEY ("flow_state_id") REFERENCES "auth"."flow_state"("id") ON DELETE CASCADE;


--
-- TOC entry 4072 (class 2606 OID 16838)
-- Name: saml_relay_states saml_relay_states_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."saml_relay_states"
    ADD CONSTRAINT "saml_relay_states_sso_provider_id_fkey" FOREIGN KEY ("sso_provider_id") REFERENCES "auth"."sso_providers"("id") ON DELETE CASCADE;


--
-- TOC entry 4064 (class 2606 OID 17060)
-- Name: sessions sessions_oauth_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."sessions"
    ADD CONSTRAINT "sessions_oauth_client_id_fkey" FOREIGN KEY ("oauth_client_id") REFERENCES "auth"."oauth_clients"("id") ON DELETE CASCADE;


--
-- TOC entry 4065 (class 2606 OID 16716)
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."sessions"
    ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- TOC entry 4069 (class 2606 OID 16805)
-- Name: sso_domains sso_domains_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."sso_domains"
    ADD CONSTRAINT "sso_domains_sso_provider_id_fkey" FOREIGN KEY ("sso_provider_id") REFERENCES "auth"."sso_providers"("id") ON DELETE CASCADE;


--
-- TOC entry 4079 (class 2606 OID 17153)
-- Name: webauthn_challenges webauthn_challenges_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."webauthn_challenges"
    ADD CONSTRAINT "webauthn_challenges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- TOC entry 4078 (class 2606 OID 17136)
-- Name: webauthn_credentials webauthn_credentials_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY "auth"."webauthn_credentials"
    ADD CONSTRAINT "webauthn_credentials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- TOC entry 4092 (class 2606 OID 17667)
-- Name: budgetitems budgetitems_id_budget_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."budgetitems"
    ADD CONSTRAINT "budgetitems_id_budget_fkey" FOREIGN KEY ("id_budget") REFERENCES "public"."budgets"("id_budget");


--
-- TOC entry 4093 (class 2606 OID 17672)
-- Name: budgetitems budgetitems_id_category_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."budgetitems"
    ADD CONSTRAINT "budgetitems_id_category_fkey" FOREIGN KEY ("id_category") REFERENCES "public"."categories"("id_cat");


--
-- TOC entry 4089 (class 2606 OID 17968)
-- Name: budgets budgets_id_category_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."budgets"
    ADD CONSTRAINT "budgets_id_category_fkey" FOREIGN KEY ("id_category") REFERENCES "public"."categories"("id_cat");


--
-- TOC entry 4090 (class 2606 OID 18027)
-- Name: budgets budgets_id_subcat_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."budgets"
    ADD CONSTRAINT "budgets_id_subcat_fkey" FOREIGN KEY ("id_subcat") REFERENCES "public"."subcategories"("id_subcat");


--
-- TOC entry 4091 (class 2606 OID 17653)
-- Name: budgets budgets_id_user_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."budgets"
    ADD CONSTRAINT "budgets_id_user_fkey" FOREIGN KEY ("id_user") REFERENCES "public"."users"("id_user");


--
-- TOC entry 4080 (class 2606 OID 17565)
-- Name: cards cards_id_user_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."cards"
    ADD CONSTRAINT "cards_id_user_fkey" FOREIGN KEY ("id_user") REFERENCES "public"."users"("id_user");


--
-- TOC entry 4081 (class 2606 OID 17580)
-- Name: categories categories_id_user_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_id_user_fkey" FOREIGN KEY ("id_user") REFERENCES "public"."users"("id_user");


--
-- TOC entry 4104 (class 2606 OID 19172)
-- Name: credit_card_payments credit_card_payments_id_card_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."credit_card_payments"
    ADD CONSTRAINT "credit_card_payments_id_card_fkey" FOREIGN KEY ("id_card") REFERENCES "public"."cards"("id_card");


--
-- TOC entry 4105 (class 2606 OID 19167)
-- Name: credit_card_payments credit_card_payments_id_user_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."credit_card_payments"
    ADD CONSTRAINT "credit_card_payments_id_user_fkey" FOREIGN KEY ("id_user") REFERENCES "auth"."users"("id");


--
-- TOC entry 4106 (class 2606 OID 19177)
-- Name: credit_card_payments credit_card_payments_source_account_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."credit_card_payments"
    ADD CONSTRAINT "credit_card_payments_source_account_fkey" FOREIGN KEY ("source_account") REFERENCES "public"."cards"("id_card");


--
-- TOC entry 4098 (class 2606 OID 17726)
-- Name: debts debts_id_user_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."debts"
    ADD CONSTRAINT "debts_id_user_fkey" FOREIGN KEY ("id_user") REFERENCES "public"."users"("id_user");


--
-- TOC entry 4084 (class 2606 OID 17637)
-- Name: expenses expenses_id_card_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_id_card_fkey" FOREIGN KEY ("id_card") REFERENCES "public"."cards"("id_card");


--
-- TOC entry 4085 (class 2606 OID 17622)
-- Name: expenses expenses_id_category_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_id_category_fkey" FOREIGN KEY ("id_category") REFERENCES "public"."categories"("id_cat");


--
-- TOC entry 4086 (class 2606 OID 26265)
-- Name: expenses expenses_id_credit_payment_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_id_credit_payment_fkey" FOREIGN KEY ("id_credit_payment") REFERENCES "public"."credit_card_payments"("id_payment") ON DELETE SET NULL;


--
-- TOC entry 4087 (class 2606 OID 17627)
-- Name: expenses expenses_id_subcat_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_id_subcat_fkey" FOREIGN KEY ("id_subcat") REFERENCES "public"."subcategories"("id_subcat");


--
-- TOC entry 4088 (class 2606 OID 17632)
-- Name: expenses expenses_id_user_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_id_user_fkey" FOREIGN KEY ("id_user") REFERENCES "public"."users"("id_user");


--
-- TOC entry 4094 (class 2606 OID 17706)
-- Name: fixedexpenses fixedexpenses_id_card_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."fixedexpenses"
    ADD CONSTRAINT "fixedexpenses_id_card_fkey" FOREIGN KEY ("id_card") REFERENCES "public"."cards"("id_card");


--
-- TOC entry 4095 (class 2606 OID 17696)
-- Name: fixedexpenses fixedexpenses_id_category_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."fixedexpenses"
    ADD CONSTRAINT "fixedexpenses_id_category_fkey" FOREIGN KEY ("id_category") REFERENCES "public"."categories"("id_cat");


--
-- TOC entry 4096 (class 2606 OID 17701)
-- Name: fixedexpenses fixedexpenses_id_subcat_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."fixedexpenses"
    ADD CONSTRAINT "fixedexpenses_id_subcat_fkey" FOREIGN KEY ("id_subcat") REFERENCES "public"."subcategories"("id_subcat");


--
-- TOC entry 4097 (class 2606 OID 17691)
-- Name: fixedexpenses fixedexpenses_id_user_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."fixedexpenses"
    ADD CONSTRAINT "fixedexpenses_id_user_fkey" FOREIGN KEY ("id_user") REFERENCES "public"."users"("id_user");


--
-- TOC entry 4099 (class 2606 OID 17920)
-- Name: incomes incomes_id_card_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."incomes"
    ADD CONSTRAINT "incomes_id_card_fkey" FOREIGN KEY ("id_card") REFERENCES "public"."cards"("id_card") ON DELETE SET NULL;


--
-- TOC entry 4100 (class 2606 OID 17915)
-- Name: incomes incomes_id_category_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."incomes"
    ADD CONSTRAINT "incomes_id_category_fkey" FOREIGN KEY ("id_category") REFERENCES "public"."categories"("id_cat") ON DELETE SET NULL;


--
-- TOC entry 4101 (class 2606 OID 17910)
-- Name: incomes incomes_id_user_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."incomes"
    ADD CONSTRAINT "incomes_id_user_fkey" FOREIGN KEY ("id_user") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- TOC entry 4102 (class 2606 OID 21512)
-- Name: monthly_incomes monthly_incomes_id_card_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."monthly_incomes"
    ADD CONSTRAINT "monthly_incomes_id_card_fkey" FOREIGN KEY ("id_card") REFERENCES "public"."cards"("id_card");


--
-- TOC entry 4103 (class 2606 OID 17963)
-- Name: monthly_incomes monthly_incomes_id_user_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."monthly_incomes"
    ADD CONSTRAINT "monthly_incomes_id_user_fkey" FOREIGN KEY ("id_user") REFERENCES "auth"."users"("id");


--
-- TOC entry 4082 (class 2606 OID 17595)
-- Name: subcategories subcategories_id_category_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."subcategories"
    ADD CONSTRAINT "subcategories_id_category_fkey" FOREIGN KEY ("id_category") REFERENCES "public"."categories"("id_cat");


--
-- TOC entry 4083 (class 2606 OID 17600)
-- Name: subcategories subcategories_id_user_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."subcategories"
    ADD CONSTRAINT "subcategories_id_user_fkey" FOREIGN KEY ("id_user") REFERENCES "public"."users"("id_user");


--
-- TOC entry 4107 (class 2606 OID 21540)
-- Name: transfers transfers_id_from_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."transfers"
    ADD CONSTRAINT "transfers_id_from_fkey" FOREIGN KEY ("id_from") REFERENCES "public"."cards"("id_card");


--
-- TOC entry 4108 (class 2606 OID 21545)
-- Name: transfers transfers_id_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."transfers"
    ADD CONSTRAINT "transfers_id_to_fkey" FOREIGN KEY ("id_to") REFERENCES "public"."cards"("id_card");


--
-- TOC entry 4109 (class 2606 OID 21535)
-- Name: transfers transfers_id_user_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."transfers"
    ADD CONSTRAINT "transfers_id_user_fkey" FOREIGN KEY ("id_user") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- TOC entry 4262 (class 0 OID 16529)
-- Dependencies: 349
-- Name: audit_log_entries; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE "auth"."audit_log_entries" ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4273 (class 0 OID 16883)
-- Dependencies: 362
-- Name: flow_state; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE "auth"."flow_state" ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4264 (class 0 OID 16681)
-- Dependencies: 353
-- Name: identities; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE "auth"."identities" ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4261 (class 0 OID 16522)
-- Dependencies: 348
-- Name: instances; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE "auth"."instances" ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4268 (class 0 OID 16770)
-- Dependencies: 357
-- Name: mfa_amr_claims; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE "auth"."mfa_amr_claims" ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4267 (class 0 OID 16758)
-- Dependencies: 356
-- Name: mfa_challenges; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE "auth"."mfa_challenges" ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4266 (class 0 OID 16745)
-- Dependencies: 355
-- Name: mfa_factors; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE "auth"."mfa_factors" ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4274 (class 0 OID 16933)
-- Dependencies: 363
-- Name: one_time_tokens; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE "auth"."one_time_tokens" ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4260 (class 0 OID 16511)
-- Dependencies: 347
-- Name: refresh_tokens; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE "auth"."refresh_tokens" ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4271 (class 0 OID 16812)
-- Dependencies: 360
-- Name: saml_providers; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE "auth"."saml_providers" ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4272 (class 0 OID 16830)
-- Dependencies: 361
-- Name: saml_relay_states; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE "auth"."saml_relay_states" ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4263 (class 0 OID 16537)
-- Dependencies: 350
-- Name: schema_migrations; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE "auth"."schema_migrations" ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4265 (class 0 OID 16711)
-- Dependencies: 354
-- Name: sessions; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE "auth"."sessions" ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4270 (class 0 OID 16797)
-- Dependencies: 359
-- Name: sso_domains; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE "auth"."sso_domains" ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4269 (class 0 OID 16788)
-- Dependencies: 358
-- Name: sso_providers; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE "auth"."sso_providers" ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4259 (class 0 OID 16499)
-- Dependencies: 345
-- Name: users; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE "auth"."users" ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4301 (class 3256 OID 21521)
-- Name: monthly_incomes Users can insert their own incomes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own incomes" ON "public"."monthly_incomes" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "id_user"));


--
-- TOC entry 4295 (class 3256 OID 17740)
-- Name: budgetitems Users can manage their own budget items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their own budget items" ON "public"."budgetitems" USING ((EXISTS ( SELECT 1
   FROM "public"."budgets"
  WHERE (("budgets"."id_budget" = "budgetitems"."id_budget") AND ("budgets"."id_user" = "auth"."uid"())))));


--
-- TOC entry 4294 (class 3256 OID 17739)
-- Name: budgets Users can manage their own budgets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their own budgets" ON "public"."budgets" USING (("auth"."uid"() = "id_user"));


--
-- TOC entry 4290 (class 3256 OID 17735)
-- Name: cards Users can manage their own cards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their own cards" ON "public"."cards" USING (("auth"."uid"() = "id_user"));


--
-- TOC entry 4291 (class 3256 OID 17736)
-- Name: categories Users can manage their own categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their own categories" ON "public"."categories" USING (("auth"."uid"() = "id_user"));


--
-- TOC entry 4297 (class 3256 OID 17742)
-- Name: debts Users can manage their own debts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their own debts" ON "public"."debts" USING (("auth"."uid"() = "id_user"));


--
-- TOC entry 4293 (class 3256 OID 17738)
-- Name: expenses Users can manage their own expenses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their own expenses" ON "public"."expenses" USING (("auth"."uid"() = "id_user"));


--
-- TOC entry 4296 (class 3256 OID 17741)
-- Name: fixedexpenses Users can manage their own fixed expenses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their own fixed expenses" ON "public"."fixedexpenses" USING (("auth"."uid"() = "id_user"));


--
-- TOC entry 4298 (class 3256 OID 17925)
-- Name: incomes Users can manage their own incomes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their own incomes" ON "public"."incomes" USING (("auth"."uid"() = "id_user"));


--
-- TOC entry 4292 (class 3256 OID 17737)
-- Name: subcategories Users can manage their own subcategories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their own subcategories" ON "public"."subcategories" USING (("auth"."uid"() = "id_user"));


--
-- TOC entry 4289 (class 3256 OID 17734)
-- Name: users Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON "public"."users" FOR UPDATE USING (("auth"."uid"() = "id_user"));


--
-- TOC entry 4302 (class 3256 OID 21522)
-- Name: monthly_incomes Users can view their own incomes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own incomes" ON "public"."monthly_incomes" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "id_user"));


--
-- TOC entry 4288 (class 3256 OID 17733)
-- Name: users Users can view their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own profile" ON "public"."users" FOR SELECT USING (("auth"."uid"() = "id_user"));


--
-- TOC entry 4299 (class 3256 OID 20314)
-- Name: credit_card_payments Usuarios pueden insertar sus propios pagos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuarios pueden insertar sus propios pagos" ON "public"."credit_card_payments" FOR INSERT WITH CHECK (("auth"."uid"() = "id_user"));


--
-- TOC entry 4300 (class 3256 OID 20315)
-- Name: credit_card_payments Usuarios pueden ver sus propios pagos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuarios pueden ver sus propios pagos" ON "public"."credit_card_payments" FOR SELECT USING (("auth"."uid"() = "id_user"));


--
-- TOC entry 4281 (class 0 OID 17658)
-- Dependencies: 392
-- Name: budgetitems; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."budgetitems" ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4280 (class 0 OID 17642)
-- Dependencies: 391
-- Name: budgets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."budgets" ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4276 (class 0 OID 17552)
-- Dependencies: 387
-- Name: cards; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."cards" ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4277 (class 0 OID 17570)
-- Dependencies: 388
-- Name: categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4286 (class 0 OID 19159)
-- Dependencies: 397
-- Name: credit_card_payments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."credit_card_payments" ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4283 (class 0 OID 17711)
-- Dependencies: 394
-- Name: debts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."debts" ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4279 (class 0 OID 17605)
-- Dependencies: 390
-- Name: expenses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."expenses" ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4282 (class 0 OID 17677)
-- Dependencies: 393
-- Name: fixedexpenses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."fixedexpenses" ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4284 (class 0 OID 17899)
-- Dependencies: 395
-- Name: incomes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."incomes" ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4285 (class 0 OID 17954)
-- Dependencies: 396
-- Name: monthly_incomes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."monthly_incomes" ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4278 (class 0 OID 17585)
-- Dependencies: 389
-- Name: subcategories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."subcategories" ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4287 (class 0 OID 21525)
-- Dependencies: 398
-- Name: transfers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."transfers" ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4275 (class 0 OID 17536)
-- Dependencies: 386
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4303 (class 3256 OID 21550)
-- Name: transfers users_own_transfers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "users_own_transfers" ON "public"."transfers" USING (("auth"."uid"() = "id_user"));


-- Completed on 2026-05-01 21:14:37

--
-- PostgreSQL database dump complete
--

\unrestrict SVvz4L3GHksUosC5vCQA4nSx6E2MnRbHNK7CvC9sapv8ga7zlFNAYxYliSJptQA

