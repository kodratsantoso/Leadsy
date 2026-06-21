--
-- PostgreSQL database dump
--

\restrict kUnspsUJptIOA4OxpPo0jX2W4Dd8ZIqlEabcgAtUuPZc6f5q9rfEroIz0snk8Zp

-- Dumped from database version 14.19 (Homebrew)
-- Dumped by pg_dump version 14.19 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: legacy_mgmt; Type: SCHEMA; Schema: -; Owner: leads
--

CREATE SCHEMA legacy_mgmt;


ALTER SCHEMA legacy_mgmt OWNER TO leads;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA legacy_mgmt;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: ActivityType; Type: TYPE; Schema: legacy_mgmt; Owner: leads
--

CREATE TYPE legacy_mgmt."ActivityType" AS ENUM (
    'NOTE',
    'EVALUATION',
    'STATUS_CHANGE',
    'OVERRIDE',
    'APPROVAL'
);


ALTER TYPE legacy_mgmt."ActivityType" OWNER TO leads;

--
-- Name: AuditAction; Type: TYPE; Schema: legacy_mgmt; Owner: leads
--

CREATE TYPE legacy_mgmt."AuditAction" AS ENUM (
    'CREATE',
    'UPDATE',
    'DELETE',
    'EVALUATE',
    'OVERRIDE',
    'SETTINGS_UPDATE'
);


ALTER TYPE legacy_mgmt."AuditAction" OWNER TO leads;

--
-- Name: EvaluationStatus; Type: TYPE; Schema: legacy_mgmt; Owner: leads
--

CREATE TYPE legacy_mgmt."EvaluationStatus" AS ENUM (
    'ELIGIBLE',
    'POTENTIAL',
    'NOT_ELIGIBLE',
    'NEED_REVIEW'
);


ALTER TYPE legacy_mgmt."EvaluationStatus" OWNER TO leads;

--
-- Name: LeadStatus; Type: TYPE; Schema: legacy_mgmt; Owner: leads
--

CREATE TYPE legacy_mgmt."LeadStatus" AS ENUM (
    'NEW',
    'EVALUATING',
    'ELIGIBLE',
    'POTENTIAL',
    'NOT_ELIGIBLE',
    'NEED_REVIEW',
    'ARCHIVED'
);


ALTER TYPE legacy_mgmt."LeadStatus" OWNER TO leads;

--
-- Name: ParameterDataType; Type: TYPE; Schema: legacy_mgmt; Owner: leads
--

CREATE TYPE legacy_mgmt."ParameterDataType" AS ENUM (
    'SELECT',
    'NUMBER',
    'BOOLEAN',
    'TEXT'
);


ALTER TYPE legacy_mgmt."ParameterDataType" OWNER TO leads;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ai_parameter_suggestions; Type: TABLE; Schema: legacy_mgmt; Owner: leads
--

CREATE TABLE legacy_mgmt.ai_parameter_suggestions (
    id text NOT NULL,
    product_id text NOT NULL,
    suggested_name character varying(150) NOT NULL,
    suggested_key character varying(100) NOT NULL,
    description text,
    reasoning text,
    status character varying(50) DEFAULT 'PENDING'::character varying NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE legacy_mgmt.ai_parameter_suggestions OWNER TO leads;

--
-- Name: ai_provider_settings; Type: TABLE; Schema: legacy_mgmt; Owner: leads
--

CREATE TABLE legacy_mgmt.ai_provider_settings (
    id text NOT NULL,
    user_id text NOT NULL,
    provider_name character varying(50) NOT NULL,
    model_name character varying(50),
    api_key_encrypted text NOT NULL,
    base_url character varying(255),
    is_active boolean DEFAULT false NOT NULL,
    validation_status character varying(50),
    last_validated_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    updated_by text
);


ALTER TABLE legacy_mgmt.ai_provider_settings OWNER TO leads;

--
-- Name: audit_logs; Type: TABLE; Schema: legacy_mgmt; Owner: leads
--

CREATE TABLE legacy_mgmt.audit_logs (
    id text NOT NULL,
    user_id text NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_id text NOT NULL,
    action legacy_mgmt."AuditAction" NOT NULL,
    changes jsonb,
    ip_address character varying(45),
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE legacy_mgmt.audit_logs OWNER TO leads;

--
-- Name: evaluation_overrides; Type: TABLE; Schema: legacy_mgmt; Owner: leads
--

CREATE TABLE legacy_mgmt.evaluation_overrides (
    id text NOT NULL,
    evaluation_id text NOT NULL,
    original_status legacy_mgmt."EvaluationStatus" NOT NULL,
    new_status legacy_mgmt."EvaluationStatus" NOT NULL,
    justification text NOT NULL,
    overridden_by text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE legacy_mgmt.evaluation_overrides OWNER TO leads;

--
-- Name: lead_activities; Type: TABLE; Schema: legacy_mgmt; Owner: leads
--

CREATE TABLE legacy_mgmt.lead_activities (
    id text NOT NULL,
    lead_id text NOT NULL,
    user_id text NOT NULL,
    type legacy_mgmt."ActivityType" NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE legacy_mgmt.lead_activities OWNER TO leads;

--
-- Name: lead_evaluations; Type: TABLE; Schema: legacy_mgmt; Owner: leads
--

CREATE TABLE legacy_mgmt.lead_evaluations (
    id text NOT NULL,
    lead_id text NOT NULL,
    total_score numeric(5,2) NOT NULL,
    status legacy_mgmt."EvaluationStatus" NOT NULL,
    dimension_scores jsonb NOT NULL,
    reasoning jsonb NOT NULL,
    risk_flags jsonb NOT NULL,
    recommendation text,
    recommended_product_id text,
    confidence_score integer,
    estimated_closing_days integer,
    hard_stop_triggered boolean DEFAULT false NOT NULL,
    hard_stop_rule character varying(50),
    evaluated_by text NOT NULL,
    evaluated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_latest boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE legacy_mgmt.lead_evaluations OWNER TO leads;

--
-- Name: lead_scores; Type: TABLE; Schema: legacy_mgmt; Owner: leads
--

CREATE TABLE legacy_mgmt.lead_scores (
    id text NOT NULL,
    lead_id text NOT NULL,
    evaluation_id text NOT NULL,
    parameter_id text NOT NULL,
    option_id text,
    raw_value text,
    points integer NOT NULL,
    reasoning text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE legacy_mgmt.lead_scores OWNER TO leads;

--
-- Name: lead_sources; Type: TABLE; Schema: legacy_mgmt; Owner: leads
--

CREATE TABLE legacy_mgmt.lead_sources (
    id text NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE legacy_mgmt.lead_sources OWNER TO leads;

--
-- Name: leads; Type: TABLE; Schema: legacy_mgmt; Owner: leads
--

CREATE TABLE legacy_mgmt.leads (
    id text NOT NULL,
    company_name character varying(255) NOT NULL,
    contact_name character varying(255) NOT NULL,
    contact_email character varying(255),
    contact_phone character varying(50),
    company_size character varying(50),
    industry character varying(100),
    annual_revenue character varying(50),
    geography character varying(100),
    source_id text,
    status legacy_mgmt."LeadStatus" DEFAULT 'NEW'::legacy_mgmt."LeadStatus" NOT NULL,
    notes text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_by text NOT NULL,
    tenant_id text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone
);


ALTER TABLE legacy_mgmt.leads OWNER TO leads;

--
-- Name: parameter_options; Type: TABLE; Schema: legacy_mgmt; Owner: leads
--

CREATE TABLE legacy_mgmt.parameter_options (
    id text NOT NULL,
    parameter_id text NOT NULL,
    label character varying(255) NOT NULL,
    value character varying(100) NOT NULL,
    points integer NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE legacy_mgmt.parameter_options OWNER TO leads;

--
-- Name: parameters; Type: TABLE; Schema: legacy_mgmt; Owner: leads
--

CREATE TABLE legacy_mgmt.parameters (
    id text NOT NULL,
    dimension_id text NOT NULL,
    product_id text,
    name character varying(100) NOT NULL,
    key character varying(50) NOT NULL,
    description text,
    data_type legacy_mgmt."ParameterDataType" DEFAULT 'SELECT'::legacy_mgmt."ParameterDataType" NOT NULL,
    is_required boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE legacy_mgmt.parameters OWNER TO leads;

--
-- Name: product_questions; Type: TABLE; Schema: legacy_mgmt; Owner: leads
--

CREATE TABLE legacy_mgmt.product_questions (
    id text NOT NULL,
    product_id text NOT NULL,
    question_text text NOT NULL,
    expected_intent text,
    sort_order integer DEFAULT 0 NOT NULL
);


ALTER TABLE legacy_mgmt.product_questions OWNER TO leads;

--
-- Name: products; Type: TABLE; Schema: legacy_mgmt; Owner: leads
--

CREATE TABLE legacy_mgmt.products (
    id text NOT NULL,
    name character varying(150) NOT NULL,
    category character varying(100),
    description text NOT NULL,
    reference_link character varying(500),
    attachment_url character varying(500),
    is_active boolean DEFAULT true NOT NULL,
    base_closing_days integer DEFAULT 30 NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE legacy_mgmt.products OWNER TO leads;

--
-- Name: roles; Type: TABLE; Schema: legacy_mgmt; Owner: leads
--

CREATE TABLE legacy_mgmt.roles (
    id text NOT NULL,
    name character varying(50) NOT NULL,
    description text,
    permissions jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE legacy_mgmt.roles OWNER TO leads;

--
-- Name: scoring_dimensions; Type: TABLE; Schema: legacy_mgmt; Owner: leads
--

CREATE TABLE legacy_mgmt.scoring_dimensions (
    id text NOT NULL,
    name character varying(100) NOT NULL,
    key character varying(50) NOT NULL,
    description text,
    weight numeric(5,4) NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE legacy_mgmt.scoring_dimensions OWNER TO leads;

--
-- Name: users; Type: TABLE; Schema: legacy_mgmt; Owner: leads
--

CREATE TABLE legacy_mgmt.users (
    id text NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    full_name character varying(255) NOT NULL,
    role_id text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    tenant_id text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone
);


ALTER TABLE legacy_mgmt.users OWNER TO leads;

--
-- Name: ai_connection_tests; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.ai_connection_tests (
    id bigint NOT NULL,
    ai_provider_id bigint NOT NULL,
    tested_by bigint,
    success boolean DEFAULT false NOT NULL,
    http_status smallint,
    latency_ms integer,
    message text,
    response_metadata json,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.ai_connection_tests OWNER TO leads;

--
-- Name: ai_connection_tests_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.ai_connection_tests_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.ai_connection_tests_id_seq OWNER TO leads;

--
-- Name: ai_connection_tests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.ai_connection_tests_id_seq OWNED BY public.ai_connection_tests.id;


--
-- Name: ai_feature_routes; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.ai_feature_routes (
    id bigint NOT NULL,
    feature_name character varying(255) NOT NULL,
    ai_model_id bigint NOT NULL,
    priority smallint DEFAULT '1'::smallint NOT NULL,
    max_retries smallint DEFAULT '1'::smallint NOT NULL,
    timeout_seconds smallint DEFAULT '30'::smallint NOT NULL,
    cost_sensitivity character varying(255) DEFAULT 'medium'::character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    cache_ttl_minutes integer,
    max_tokens integer,
    complexity_mode character varying(255) DEFAULT 'standard'::character varying NOT NULL
);


ALTER TABLE public.ai_feature_routes OWNER TO leads;

--
-- Name: ai_feature_routes_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.ai_feature_routes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.ai_feature_routes_id_seq OWNER TO leads;

--
-- Name: ai_feature_routes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.ai_feature_routes_id_seq OWNED BY public.ai_feature_routes.id;


--
-- Name: ai_model_routes; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.ai_model_routes (
    id bigint NOT NULL,
    function_name character varying(255) NOT NULL,
    primary_model_id bigint NOT NULL,
    fallback_model_id bigint,
    retry_count smallint DEFAULT '2'::smallint NOT NULL,
    timeout_seconds smallint DEFAULT '30'::smallint NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.ai_model_routes OWNER TO leads;

--
-- Name: ai_model_routes_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.ai_model_routes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.ai_model_routes_id_seq OWNER TO leads;

--
-- Name: ai_model_routes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.ai_model_routes_id_seq OWNED BY public.ai_model_routes.id;


--
-- Name: ai_models; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.ai_models (
    id bigint NOT NULL,
    ai_provider_id bigint NOT NULL,
    name character varying(255) NOT NULL,
    context_window integer,
    capabilities json,
    cost_tier character varying(255) DEFAULT 'medium'::character varying NOT NULL,
    default_usage_type character varying(255),
    status character varying(255) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    CONSTRAINT ai_models_cost_tier_check CHECK (((cost_tier)::text = ANY (ARRAY[('low'::character varying)::text, ('medium'::character varying)::text, ('high'::character varying)::text]))),
    CONSTRAINT ai_models_status_check CHECK (((status)::text = ANY (ARRAY[('active'::character varying)::text, ('deprecated'::character varying)::text])))
);


ALTER TABLE public.ai_models OWNER TO leads;

--
-- Name: ai_models_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.ai_models_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.ai_models_id_seq OWNER TO leads;

--
-- Name: ai_models_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.ai_models_id_seq OWNED BY public.ai_models.id;


--
-- Name: ai_prompt_template_versions; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.ai_prompt_template_versions (
    id bigint NOT NULL,
    ai_prompt_template_id bigint NOT NULL,
    version integer NOT NULL,
    content text NOT NULL,
    is_active boolean DEFAULT false NOT NULL,
    is_enabled boolean DEFAULT true NOT NULL,
    created_by bigint,
    activated_by bigint,
    activated_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.ai_prompt_template_versions OWNER TO leads;

--
-- Name: ai_prompt_template_versions_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.ai_prompt_template_versions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.ai_prompt_template_versions_id_seq OWNER TO leads;

--
-- Name: ai_prompt_template_versions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.ai_prompt_template_versions_id_seq OWNED BY public.ai_prompt_template_versions.id;


--
-- Name: ai_prompt_templates; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.ai_prompt_templates (
    id bigint NOT NULL,
    feature_name character varying(255) NOT NULL,
    template_name character varying(255) NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    created_by bigint,
    updated_by bigint,
    active_version_id bigint,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.ai_prompt_templates OWNER TO leads;

--
-- Name: ai_prompt_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.ai_prompt_templates_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.ai_prompt_templates_id_seq OWNER TO leads;

--
-- Name: ai_prompt_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.ai_prompt_templates_id_seq OWNED BY public.ai_prompt_templates.id;


--
-- Name: ai_providers; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.ai_providers (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    slug character varying(255) NOT NULL,
    base_url character varying(255),
    api_key_encrypted text NOT NULL,
    organization_id character varying(255),
    region character varying(255),
    status character varying(255) DEFAULT 'active'::character varying NOT NULL,
    environments json,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    provider_type character varying(255) DEFAULT 'custom'::character varying NOT NULL,
    api_key_last4 character varying(8),
    project_id character varying(255),
    default_model character varying(255),
    timeout_seconds smallint DEFAULT '30'::smallint NOT NULL,
    retry_limit smallint DEFAULT '1'::smallint NOT NULL,
    max_tokens_default integer,
    cache_ttl_minutes integer,
    cost_sensitivity character varying(255) DEFAULT 'balanced'::character varying NOT NULL,
    last_tested_at timestamp(0) without time zone,
    last_test_status character varying(255),
    last_test_message text,
    last_used_at timestamp(0) without time zone,
    last_used_model character varying(255),
    CONSTRAINT ai_providers_status_check CHECK (((status)::text = ANY (ARRAY[('active'::character varying)::text, ('inactive'::character varying)::text])))
);


ALTER TABLE public.ai_providers OWNER TO leads;

--
-- Name: ai_providers_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.ai_providers_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.ai_providers_id_seq OWNER TO leads;

--
-- Name: ai_providers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.ai_providers_id_seq OWNED BY public.ai_providers.id;


--
-- Name: ai_requests; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.ai_requests (
    id bigint NOT NULL,
    ai_model_id bigint,
    user_id bigint,
    function_name character varying(255) NOT NULL,
    prompt_metadata json,
    response_metadata json,
    prompt_tokens integer,
    completion_tokens integer,
    estimated_cost_usd numeric(8,6),
    latency_ms integer,
    status character varying(255) DEFAULT 'success'::character varying NOT NULL,
    error_message text,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    fallback_used boolean DEFAULT false NOT NULL,
    CONSTRAINT ai_requests_status_check CHECK (((status)::text = ANY (ARRAY[('success'::character varying)::text, ('failure'::character varying)::text, ('timeout'::character varying)::text])))
);


ALTER TABLE public.ai_requests OWNER TO leads;

--
-- Name: ai_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.ai_requests_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.ai_requests_id_seq OWNER TO leads;

--
-- Name: ai_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.ai_requests_id_seq OWNED BY public.ai_requests.id;


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.audit_logs (
    id bigint NOT NULL,
    user_id bigint,
    action character varying(255) NOT NULL,
    module character varying(255) NOT NULL,
    record_type character varying(255),
    record_id bigint,
    before_value json,
    after_value json,
    ip_address character varying(45),
    user_agent character varying(255),
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    request_method character varying(10),
    route_path character varying(255),
    status character varying(50) DEFAULT 'success'::character varying NOT NULL,
    metadata_json json,
    tenant_id bigint
);


ALTER TABLE public.audit_logs OWNER TO leads;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.audit_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.audit_logs_id_seq OWNER TO leads;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: cache; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.cache (
    key character varying(255) NOT NULL,
    value text NOT NULL,
    expiration integer NOT NULL
);


ALTER TABLE public.cache OWNER TO leads;

--
-- Name: cache_locks; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.cache_locks (
    key character varying(255) NOT NULL,
    owner character varying(255) NOT NULL,
    expiration integer NOT NULL
);


ALTER TABLE public.cache_locks OWNER TO leads;

--
-- Name: contact_enrichment_candidates; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.contact_enrichment_candidates (
    id bigint NOT NULL,
    lead_id bigint NOT NULL,
    created_by bigint,
    provider character varying(40) NOT NULL,
    provider_candidate_id character varying(255) NOT NULL,
    name character varying(255),
    title character varying(255),
    company_name character varying(255),
    company_domain character varying(255),
    has_email boolean DEFAULT false NOT NULL,
    has_phone boolean DEFAULT false NOT NULL,
    reveal_email_credits smallint DEFAULT '0'::smallint NOT NULL,
    reveal_phone_credits smallint DEFAULT '0'::smallint NOT NULL,
    status character varying(30) DEFAULT 'previewed'::character varying NOT NULL,
    raw_preview json,
    raw_reveal json,
    expires_at timestamp(0) without time zone,
    revealed_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.contact_enrichment_candidates OWNER TO leads;

--
-- Name: contact_enrichment_candidates_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.contact_enrichment_candidates_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.contact_enrichment_candidates_id_seq OWNER TO leads;

--
-- Name: contact_enrichment_candidates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.contact_enrichment_candidates_id_seq OWNED BY public.contact_enrichment_candidates.id;


--
-- Name: contact_sources; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.contact_sources (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.contact_sources OWNER TO leads;

--
-- Name: contact_sources_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.contact_sources_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.contact_sources_id_seq OWNER TO leads;

--
-- Name: contact_sources_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.contact_sources_id_seq OWNED BY public.contact_sources.id;


--
-- Name: currencies; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.currencies (
    id bigint NOT NULL,
    code character varying(3) NOT NULL,
    name character varying(255) NOT NULL,
    symbol character varying(12),
    minor_unit smallint DEFAULT '2'::smallint NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    exchange_rate numeric(15,4),
    exchange_rate_updated_at timestamp(0) without time zone,
    base_currency character varying(3)
);


ALTER TABLE public.currencies OWNER TO leads;

--
-- Name: currencies_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.currencies_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.currencies_id_seq OWNER TO leads;

--
-- Name: currencies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.currencies_id_seq OWNED BY public.currencies.id;


--
-- Name: currency_settings; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.currency_settings (
    id bigint NOT NULL,
    tenant_id bigint,
    currency_id bigint NOT NULL,
    thousands_separator character varying(4) DEFAULT '.'::character varying NOT NULL,
    decimal_separator character varying(4) DEFAULT ','::character varying NOT NULL,
    decimal_digits smallint DEFAULT '2'::smallint NOT NULL,
    symbol_position character varying(255) DEFAULT 'before'::character varying NOT NULL,
    space_between_symbol boolean DEFAULT true NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    CONSTRAINT currency_settings_symbol_position_check CHECK (((symbol_position)::text = ANY (ARRAY[('before'::character varying)::text, ('after'::character varying)::text])))
);


ALTER TABLE public.currency_settings OWNER TO leads;

--
-- Name: currency_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.currency_settings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.currency_settings_id_seq OWNER TO leads;

--
-- Name: currency_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.currency_settings_id_seq OWNED BY public.currency_settings.id;


--
-- Name: discovery_categories; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.discovery_categories (
    id bigint NOT NULL,
    label character varying(255) NOT NULL,
    value character varying(255) NOT NULL,
    sort_order smallint DEFAULT '0'::smallint NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.discovery_categories OWNER TO leads;

--
-- Name: discovery_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.discovery_categories_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.discovery_categories_id_seq OWNER TO leads;

--
-- Name: discovery_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.discovery_categories_id_seq OWNED BY public.discovery_categories.id;


--
-- Name: email_verification_otps; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.email_verification_otps (
    id bigint NOT NULL,
    email character varying(255) NOT NULL,
    otp character varying(6) NOT NULL,
    expires_at timestamp(0) without time zone NOT NULL,
    used_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.email_verification_otps OWNER TO leads;

--
-- Name: email_verification_otps_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.email_verification_otps_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.email_verification_otps_id_seq OWNER TO leads;

--
-- Name: email_verification_otps_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.email_verification_otps_id_seq OWNED BY public.email_verification_otps.id;


--
-- Name: failed_jobs; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.failed_jobs (
    id bigint NOT NULL,
    uuid character varying(255) NOT NULL,
    connection text NOT NULL,
    queue text NOT NULL,
    payload text NOT NULL,
    exception text NOT NULL,
    failed_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.failed_jobs OWNER TO leads;

--
-- Name: failed_jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.failed_jobs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.failed_jobs_id_seq OWNER TO leads;

--
-- Name: failed_jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.failed_jobs_id_seq OWNED BY public.failed_jobs.id;


--
-- Name: funnel_stages; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.funnel_stages (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    sequence smallint DEFAULT '0'::smallint NOT NULL,
    color character varying(7) DEFAULT '#6366f1'::character varying NOT NULL,
    probability smallint DEFAULT '0'::smallint NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.funnel_stages OWNER TO leads;

--
-- Name: funnel_stages_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.funnel_stages_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.funnel_stages_id_seq OWNER TO leads;

--
-- Name: funnel_stages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.funnel_stages_id_seq OWNED BY public.funnel_stages.id;


--
-- Name: geo_product_fit_analyses; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.geo_product_fit_analyses (
    id bigint NOT NULL,
    place_id character varying(255) NOT NULL,
    product_id bigint NOT NULL,
    lead_id bigint,
    fit_score smallint DEFAULT '0'::smallint NOT NULL,
    fit_level character varying(20) DEFAULT 'unknown'::character varying NOT NULL,
    confidence_score smallint DEFAULT '0'::smallint NOT NULL,
    reasoning json,
    matched_signals json,
    missing_information json,
    risk_flags json,
    recommended_approach text,
    recommended_next_action text,
    potential_use_case text,
    pre_fit_score smallint DEFAULT '0'::smallint NOT NULL,
    analyzed_with_ai boolean DEFAULT false NOT NULL,
    ai_provider_used character varying(100),
    ai_model_used character varying(150),
    source_payload_hash character varying(64),
    product_payload_hash character varying(64),
    analyzed_at timestamp(0) without time zone,
    created_by bigint,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.geo_product_fit_analyses OWNER TO leads;

--
-- Name: geo_product_fit_analyses_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.geo_product_fit_analyses_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.geo_product_fit_analyses_id_seq OWNER TO leads;

--
-- Name: geo_product_fit_analyses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.geo_product_fit_analyses_id_seq OWNED BY public.geo_product_fit_analyses.id;


--
-- Name: icp_profiles; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.icp_profiles (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    target_industries json,
    target_company_sizes json,
    target_territories json,
    min_lead_score integer DEFAULT 0 NOT NULL,
    required_fields json,
    weight_lead_score numeric(4,2) DEFAULT 0.3 NOT NULL,
    weight_industry numeric(4,2) DEFAULT 0.25 NOT NULL,
    weight_company_size numeric(4,2) DEFAULT 0.2 NOT NULL,
    weight_territory numeric(4,2) DEFAULT 0.15 NOT NULL,
    weight_contact_info numeric(4,2) DEFAULT 0.1 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by bigint,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    tenant_id bigint
);


ALTER TABLE public.icp_profiles OWNER TO leads;

--
-- Name: icp_profiles_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.icp_profiles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.icp_profiles_id_seq OWNER TO leads;

--
-- Name: icp_profiles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.icp_profiles_id_seq OWNED BY public.icp_profiles.id;


--
-- Name: industries; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.industries (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    synonyms json,
    scoring_hints text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.industries OWNER TO leads;

--
-- Name: industries_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.industries_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.industries_id_seq OWNER TO leads;

--
-- Name: industries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.industries_id_seq OWNED BY public.industries.id;


--
-- Name: integration_configs; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.integration_configs (
    id bigint NOT NULL,
    category character varying(255) NOT NULL,
    key character varying(255) NOT NULL,
    value_encrypted text,
    value_type character varying(255) DEFAULT 'string'::character varying NOT NULL,
    is_secret boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    tenant_id bigint
);


ALTER TABLE public.integration_configs OWNER TO leads;

--
-- Name: integration_configs_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.integration_configs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.integration_configs_id_seq OWNER TO leads;

--
-- Name: integration_configs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.integration_configs_id_seq OWNED BY public.integration_configs.id;


--
-- Name: integration_connections; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.integration_connections (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    created_by bigint,
    provider character varying(80) NOT NULL,
    provider_account_id character varying(255),
    provider_account_name character varying(255),
    display_name character varying(255) NOT NULL,
    auth_type character varying(40) DEFAULT 'oauth2'::character varying NOT NULL,
    status character varying(40) DEFAULT 'disconnected'::character varying NOT NULL,
    is_enabled boolean DEFAULT false NOT NULL,
    scopes json DEFAULT '[]'::json NOT NULL,
    config json DEFAULT '{}'::json NOT NULL,
    metadata json DEFAULT '{}'::json NOT NULL,
    connected_at timestamp(0) without time zone,
    disconnected_at timestamp(0) without time zone,
    last_tested_at timestamp(0) without time zone,
    last_success_at timestamp(0) without time zone,
    last_error_at timestamp(0) without time zone,
    last_error_code character varying(255),
    last_error_message text,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    deleted_at timestamp(0) without time zone
);


ALTER TABLE public.integration_connections OWNER TO leads;

--
-- Name: integration_connections_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.integration_connections_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.integration_connections_id_seq OWNER TO leads;

--
-- Name: integration_connections_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.integration_connections_id_seq OWNED BY public.integration_connections.id;


--
-- Name: integration_credential_stores; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.integration_credential_stores (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    integration_connection_id bigint NOT NULL,
    credential_type character varying(60) NOT NULL,
    key_name character varying(100) NOT NULL,
    encrypted_value text NOT NULL,
    encryption_key_id character varying(100) NOT NULL,
    value_fingerprint character(64),
    last4 character varying(8),
    metadata json DEFAULT '{}'::json NOT NULL,
    expires_at timestamp(0) without time zone,
    rotated_at timestamp(0) without time zone,
    revoked_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    deleted_at timestamp(0) without time zone
);


ALTER TABLE public.integration_credential_stores OWNER TO leads;

--
-- Name: integration_credential_stores_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.integration_credential_stores_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.integration_credential_stores_id_seq OWNER TO leads;

--
-- Name: integration_credential_stores_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.integration_credential_stores_id_seq OWNED BY public.integration_credential_stores.id;


--
-- Name: integration_entity_mappings; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.integration_entity_mappings (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    integration_connection_id bigint NOT NULL,
    provider character varying(80) NOT NULL,
    external_entity_type character varying(80) NOT NULL,
    external_entity_id character varying(255) NOT NULL,
    leadsy_entity_type character varying(80) NOT NULL,
    leadsy_entity_id bigint NOT NULL,
    metadata json DEFAULT '{}'::json NOT NULL,
    last_synced_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.integration_entity_mappings OWNER TO leads;

--
-- Name: integration_entity_mappings_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.integration_entity_mappings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.integration_entity_mappings_id_seq OWNER TO leads;

--
-- Name: integration_entity_mappings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.integration_entity_mappings_id_seq OWNED BY public.integration_entity_mappings.id;


--
-- Name: integration_webhook_events; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.integration_webhook_events (
    id bigint NOT NULL,
    tenant_id bigint,
    integration_connection_id bigint,
    provider character varying(80) NOT NULL,
    event_type character varying(120),
    external_event_id character varying(255),
    idempotency_key character(64) NOT NULL,
    payload_hash character(64) NOT NULL,
    payload json NOT NULL,
    headers json,
    status character varying(40) DEFAULT 'received'::character varying NOT NULL,
    attempts smallint DEFAULT '0'::smallint NOT NULL,
    processing_error text,
    received_at timestamp(0) without time zone NOT NULL,
    processed_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.integration_webhook_events OWNER TO leads;

--
-- Name: integration_webhook_events_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.integration_webhook_events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.integration_webhook_events_id_seq OWNER TO leads;

--
-- Name: integration_webhook_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.integration_webhook_events_id_seq OWNED BY public.integration_webhook_events.id;


--
-- Name: job_batches; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.job_batches (
    id character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    total_jobs integer NOT NULL,
    pending_jobs integer NOT NULL,
    failed_jobs integer NOT NULL,
    failed_job_ids text NOT NULL,
    options text,
    cancelled_at integer,
    created_at integer NOT NULL,
    finished_at integer
);


ALTER TABLE public.job_batches OWNER TO leads;

--
-- Name: jobs; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.jobs (
    id bigint NOT NULL,
    queue character varying(255) NOT NULL,
    payload text NOT NULL,
    attempts smallint NOT NULL,
    reserved_at integer,
    available_at integer NOT NULL,
    created_at integer NOT NULL
);


ALTER TABLE public.jobs OWNER TO leads;

--
-- Name: jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.jobs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.jobs_id_seq OWNER TO leads;

--
-- Name: jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.jobs_id_seq OWNED BY public.jobs.id;


--
-- Name: lark_base_record_mappings; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.lark_base_record_mappings (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    lark_base_table_id bigint NOT NULL,
    leadsy_entity_type character varying(255) DEFAULT 'lead'::character varying NOT NULL,
    leadsy_entity_id character varying(255) NOT NULL,
    lark_record_id character varying(255) NOT NULL,
    last_lark_updated_at timestamp(0) without time zone,
    last_leadsy_updated_at timestamp(0) without time zone,
    last_sync_source character varying(255),
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.lark_base_record_mappings OWNER TO leads;

--
-- Name: lark_base_record_mappings_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.lark_base_record_mappings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.lark_base_record_mappings_id_seq OWNER TO leads;

--
-- Name: lark_base_record_mappings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.lark_base_record_mappings_id_seq OWNED BY public.lark_base_record_mappings.id;


--
-- Name: lark_base_tables; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.lark_base_tables (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    lark_integration_id bigint NOT NULL,
    app_token character varying(255) NOT NULL,
    table_id character varying(255) NOT NULL,
    table_name character varying(255),
    leadsy_entity_type character varying(255) DEFAULT 'lead'::character varying NOT NULL,
    sync_direction character varying(255) DEFAULT 'two_way'::character varying NOT NULL,
    field_mapping json DEFAULT '{}'::json NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    last_pull_at timestamp(0) without time zone,
    last_push_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.lark_base_tables OWNER TO leads;

--
-- Name: lark_base_tables_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.lark_base_tables_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.lark_base_tables_id_seq OWNER TO leads;

--
-- Name: lark_base_tables_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.lark_base_tables_id_seq OWNED BY public.lark_base_tables.id;


--
-- Name: lark_events; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.lark_events (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    lark_integration_id bigint NOT NULL,
    event_type character varying(255) NOT NULL,
    lark_entity_type character varying(255),
    lark_entity_id character varying(255),
    event_data json,
    status character varying(255) DEFAULT 'received'::character varying NOT NULL,
    processing_error text,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.lark_events OWNER TO leads;

--
-- Name: lark_events_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.lark_events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.lark_events_id_seq OWNER TO leads;

--
-- Name: lark_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.lark_events_id_seq OWNED BY public.lark_events.id;


--
-- Name: lark_integrations; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.lark_integrations (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    app_id character varying(255) NOT NULL,
    app_secret_encrypted text,
    verification_token_encrypted text,
    encrypt_key_encrypted text,
    base_url character varying(255),
    features json DEFAULT '{}'::json NOT NULL,
    enabled_modules json DEFAULT '{}'::json NOT NULL,
    is_active boolean DEFAULT false NOT NULL,
    last_sync_at timestamp(0) without time zone,
    sync_status text,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    deleted_at timestamp(0) without time zone
);


ALTER TABLE public.lark_integrations OWNER TO leads;

--
-- Name: lark_integrations_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.lark_integrations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.lark_integrations_id_seq OWNER TO leads;

--
-- Name: lark_integrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.lark_integrations_id_seq OWNED BY public.lark_integrations.id;


--
-- Name: lark_sso_users; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.lark_sso_users (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    user_id bigint NOT NULL,
    lark_user_id character varying(255) NOT NULL,
    lark_union_id character varying(255),
    lark_email character varying(255),
    lark_name character varying(255),
    lark_mobile character varying(255),
    lark_avatar_url character varying(255),
    lark_department_id character varying(255),
    lark_direct_manager_id character varying(255),
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.lark_sso_users OWNER TO leads;

--
-- Name: lark_sso_users_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.lark_sso_users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.lark_sso_users_id_seq OWNER TO leads;

--
-- Name: lark_sso_users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.lark_sso_users_id_seq OWNED BY public.lark_sso_users.id;


--
-- Name: lark_syncs; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.lark_syncs (
    id bigint NOT NULL,
    tenant_id bigint NOT NULL,
    lark_integration_id bigint NOT NULL,
    module character varying(255) NOT NULL,
    action character varying(255) NOT NULL,
    lark_entity_type character varying(255),
    lark_entity_id character varying(255),
    leadsy_entity_type character varying(255),
    leadsy_entity_id character varying(255),
    status character varying(255) DEFAULT 'pending'::character varying NOT NULL,
    request_data text,
    response_data text,
    error_message text,
    retry_count integer DEFAULT 0 NOT NULL,
    next_retry_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.lark_syncs OWNER TO leads;

--
-- Name: lark_syncs_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.lark_syncs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.lark_syncs_id_seq OWNER TO leads;

--
-- Name: lark_syncs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.lark_syncs_id_seq OWNED BY public.lark_syncs.id;


--
-- Name: lead_activities; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.lead_activities (
    id bigint NOT NULL,
    lead_id bigint NOT NULL,
    activity_type character varying(255) NOT NULL,
    description text,
    activity_date timestamp(0) without time zone NOT NULL,
    related_entity_type character varying(255),
    related_entity_id bigint,
    user_id bigint,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    tenant_id bigint,
    outcome character varying(1000),
    activity_date_override timestamp(0) without time zone,
    next_follow_up_date date,
    budget text,
    authority text,
    needs text,
    timeline text,
    competitor text
);


ALTER TABLE public.lead_activities OWNER TO leads;

--
-- Name: lead_activities_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.lead_activities_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.lead_activities_id_seq OWNER TO leads;

--
-- Name: lead_activities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.lead_activities_id_seq OWNED BY public.lead_activities.id;


--
-- Name: lead_ai_analyses; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.lead_ai_analyses (
    id bigint NOT NULL,
    lead_id bigint NOT NULL,
    relevance_score smallint,
    business_opportunity_summary text,
    probable_needs json,
    suggested_approach text,
    urgency_level character varying(255) DEFAULT 'unknown'::character varying NOT NULL,
    confidence_score smallint,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    company_summary text,
    potential_use_case text,
    risk_insight text,
    CONSTRAINT lead_ai_analyses_urgency_level_check CHECK (((urgency_level)::text = ANY (ARRAY[('high'::character varying)::text, ('medium'::character varying)::text, ('low'::character varying)::text, ('unknown'::character varying)::text])))
);


ALTER TABLE public.lead_ai_analyses OWNER TO leads;

--
-- Name: lead_ai_analyses_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.lead_ai_analyses_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.lead_ai_analyses_id_seq OWNER TO leads;

--
-- Name: lead_ai_analyses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.lead_ai_analyses_id_seq OWNED BY public.lead_ai_analyses.id;


--
-- Name: lead_ai_evaluations; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.lead_ai_evaluations (
    id bigint NOT NULL,
    lead_id bigint NOT NULL,
    source_type character varying(255) NOT NULL,
    source_id bigint NOT NULL,
    sentiment character varying(255),
    intent_level character varying(255),
    interest_level character varying(255),
    objections_detected json,
    buying_signals json,
    next_best_action text,
    recommended_product_id bigint,
    confidence_score smallint,
    evaluated_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    summary text,
    bantc_extracted json
);


ALTER TABLE public.lead_ai_evaluations OWNER TO leads;

--
-- Name: lead_ai_evaluations_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.lead_ai_evaluations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.lead_ai_evaluations_id_seq OWNER TO leads;

--
-- Name: lead_ai_evaluations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.lead_ai_evaluations_id_seq OWNED BY public.lead_ai_evaluations.id;


--
-- Name: lead_analysis_logs; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.lead_analysis_logs (
    id bigint NOT NULL,
    tenant_id bigint,
    lead_id bigint NOT NULL,
    analysis_type character varying(100) NOT NULL,
    result_json json NOT NULL,
    created_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.lead_analysis_logs OWNER TO leads;

--
-- Name: lead_analysis_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.lead_analysis_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.lead_analysis_logs_id_seq OWNER TO leads;

--
-- Name: lead_analysis_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.lead_analysis_logs_id_seq OWNED BY public.lead_analysis_logs.id;


--
-- Name: lead_bantc_question_guides; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.lead_bantc_question_guides (
    id bigint NOT NULL,
    lead_id bigint NOT NULL,
    questions json DEFAULT '[]'::json NOT NULL,
    ai_generated boolean DEFAULT false NOT NULL,
    ai_model character varying(255),
    updated_by bigint,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.lead_bantc_question_guides OWNER TO leads;

--
-- Name: lead_bantc_question_guides_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.lead_bantc_question_guides_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.lead_bantc_question_guides_id_seq OWNER TO leads;

--
-- Name: lead_bantc_question_guides_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.lead_bantc_question_guides_id_seq OWNED BY public.lead_bantc_question_guides.id;


--
-- Name: lead_channel_types; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.lead_channel_types (
    id bigint NOT NULL,
    lead_source_type_id bigint NOT NULL,
    name character varying(255) NOT NULL,
    slug character varying(255) NOT NULL,
    description text,
    sort_order smallint DEFAULT '0'::smallint NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.lead_channel_types OWNER TO leads;

--
-- Name: lead_channel_types_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.lead_channel_types_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.lead_channel_types_id_seq OWNER TO leads;

--
-- Name: lead_channel_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.lead_channel_types_id_seq OWNED BY public.lead_channel_types.id;


--
-- Name: lead_contact_payloads; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.lead_contact_payloads (
    id bigint NOT NULL,
    contact_id bigint NOT NULL,
    source_type character varying(255) NOT NULL,
    raw_payload json,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.lead_contact_payloads OWNER TO leads;

--
-- Name: lead_contact_payloads_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.lead_contact_payloads_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.lead_contact_payloads_id_seq OWNER TO leads;

--
-- Name: lead_contact_payloads_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.lead_contact_payloads_id_seq OWNED BY public.lead_contact_payloads.id;


--
-- Name: lead_contacts; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.lead_contacts (
    id bigint NOT NULL,
    lead_id bigint NOT NULL,
    name character varying(255) NOT NULL,
    title character varying(255),
    email character varying(255),
    phone character varying(30),
    linkedin_url character varying(255),
    contact_source_id bigint,
    confidence character varying(255) DEFAULT 'medium'::character varying NOT NULL,
    last_verified_at date,
    do_not_contact boolean DEFAULT false NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    is_primary boolean DEFAULT false NOT NULL,
    source character varying(255) DEFAULT 'other'::character varying NOT NULL,
    confidence_score smallint DEFAULT '50'::smallint NOT NULL,
    CONSTRAINT lead_contacts_confidence_check CHECK (((confidence)::text = ANY (ARRAY[('high'::character varying)::text, ('medium'::character varying)::text, ('low'::character varying)::text])))
);


ALTER TABLE public.lead_contacts OWNER TO leads;

--
-- Name: lead_contacts_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.lead_contacts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.lead_contacts_id_seq OWNER TO leads;

--
-- Name: lead_contacts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.lead_contacts_id_seq OWNED BY public.lead_contacts.id;


--
-- Name: lead_conversion_predictions; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.lead_conversion_predictions (
    id bigint NOT NULL,
    lead_id bigint NOT NULL,
    probability_to_close numeric(5,2) NOT NULL,
    expected_deal_size numeric(15,2),
    estimated_sales_effort character varying(255) NOT NULL,
    confidence_score numeric(5,2) DEFAULT '0'::numeric NOT NULL,
    prediction_factors json,
    model_version character varying(255) DEFAULT 'v1.0-rule-based'::character varying NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.lead_conversion_predictions OWNER TO leads;

--
-- Name: lead_conversion_predictions_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.lead_conversion_predictions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.lead_conversion_predictions_id_seq OWNER TO leads;

--
-- Name: lead_conversion_predictions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.lead_conversion_predictions_id_seq OWNED BY public.lead_conversion_predictions.id;


--
-- Name: lead_follow_ups; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.lead_follow_ups (
    id bigint NOT NULL,
    lead_id bigint NOT NULL,
    due_date timestamp(0) without time zone NOT NULL,
    status character varying(255) DEFAULT 'pending'::character varying NOT NULL,
    purpose character varying(255),
    assigned_to bigint,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    CONSTRAINT lead_follow_ups_status_check CHECK (((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('completed'::character varying)::text, ('overdue'::character varying)::text, ('cancelled'::character varying)::text])))
);


ALTER TABLE public.lead_follow_ups OWNER TO leads;

--
-- Name: lead_follow_ups_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.lead_follow_ups_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.lead_follow_ups_id_seq OWNER TO leads;

--
-- Name: lead_follow_ups_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.lead_follow_ups_id_seq OWNED BY public.lead_follow_ups.id;


--
-- Name: lead_funnel_history; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.lead_funnel_history (
    id bigint NOT NULL,
    lead_id bigint NOT NULL,
    from_stage_id bigint,
    to_stage_id bigint,
    moved_by bigint,
    notes text,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.lead_funnel_history OWNER TO leads;

--
-- Name: lead_funnel_history_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.lead_funnel_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.lead_funnel_history_id_seq OWNER TO leads;

--
-- Name: lead_funnel_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.lead_funnel_history_id_seq OWNED BY public.lead_funnel_history.id;


--
-- Name: lead_icp_config; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.lead_icp_config (
    id bigint NOT NULL,
    tenant_id bigint,
    industry character varying(255) NOT NULL,
    size_range character varying(255),
    location character varying(255),
    priority_weight numeric(5,2) DEFAULT '0'::numeric NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.lead_icp_config OWNER TO leads;

--
-- Name: lead_icp_config_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.lead_icp_config_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.lead_icp_config_id_seq OWNER TO leads;

--
-- Name: lead_icp_config_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.lead_icp_config_id_seq OWNED BY public.lead_icp_config.id;


--
-- Name: lead_icp_matches; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.lead_icp_matches (
    id bigint NOT NULL,
    lead_id bigint NOT NULL,
    icp_profile_id bigint NOT NULL,
    match_score numeric(5,2) DEFAULT '0'::numeric NOT NULL,
    match_level character varying(255) NOT NULL,
    score_breakdown json,
    evaluated_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.lead_icp_matches OWNER TO leads;

--
-- Name: lead_icp_matches_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.lead_icp_matches_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.lead_icp_matches_id_seq OWNER TO leads;

--
-- Name: lead_icp_matches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.lead_icp_matches_id_seq OWNED BY public.lead_icp_matches.id;


--
-- Name: lead_meetings; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.lead_meetings (
    id bigint NOT NULL,
    lead_id bigint NOT NULL,
    meeting_date timestamp(0) without time zone NOT NULL,
    meeting_type character varying(255),
    participants json,
    summary text,
    key_points json,
    objections json,
    next_steps json,
    follow_up_date date,
    created_by bigint,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.lead_meetings OWNER TO leads;

--
-- Name: lead_meetings_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.lead_meetings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.lead_meetings_id_seq OWNER TO leads;

--
-- Name: lead_meetings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.lead_meetings_id_seq OWNED BY public.lead_meetings.id;


--
-- Name: lead_outcomes; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.lead_outcomes (
    id bigint NOT NULL,
    lead_id bigint NOT NULL,
    outcome character varying(255) NOT NULL,
    deal_size numeric(15,2),
    loss_reason character varying(255),
    loss_category character varying(255),
    feedback_notes text,
    closed_by bigint,
    closed_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    product_id bigint,
    sale_type character varying(255) DEFAULT 'new_sales'::character varying NOT NULL
);


ALTER TABLE public.lead_outcomes OWNER TO leads;

--
-- Name: lead_outcomes_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.lead_outcomes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.lead_outcomes_id_seq OWNER TO leads;

--
-- Name: lead_outcomes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.lead_outcomes_id_seq OWNED BY public.lead_outcomes.id;


--
-- Name: lead_pre_meeting_briefs; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.lead_pre_meeting_briefs (
    id bigint NOT NULL,
    lead_id bigint NOT NULL,
    product_id bigint,
    summary_json json,
    objective_hypothesis_json json,
    strategy_json json,
    questions_json json,
    demo_strategy_json json,
    bantc_pre_json json,
    pain_point_json json,
    risk_analysis_json json,
    readiness_score integer,
    ai_provider character varying(255),
    ai_model character varying(255),
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.lead_pre_meeting_briefs OWNER TO leads;

--
-- Name: lead_pre_meeting_briefs_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.lead_pre_meeting_briefs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.lead_pre_meeting_briefs_id_seq OWNER TO leads;

--
-- Name: lead_pre_meeting_briefs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.lead_pre_meeting_briefs_id_seq OWNED BY public.lead_pre_meeting_briefs.id;


--
-- Name: lead_prescriptions; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.lead_prescriptions (
    id bigint NOT NULL,
    lead_id bigint NOT NULL,
    recommended_owner_id bigint,
    recommended_approach text NOT NULL,
    next_best_action character varying(255) NOT NULL,
    follow_up_timing character varying(255) NOT NULL,
    priority_score integer DEFAULT 5 NOT NULL,
    reasoning text,
    is_applied boolean DEFAULT false NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.lead_prescriptions OWNER TO leads;

--
-- Name: lead_prescriptions_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.lead_prescriptions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.lead_prescriptions_id_seq OWNER TO leads;

--
-- Name: lead_prescriptions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.lead_prescriptions_id_seq OWNED BY public.lead_prescriptions.id;


--
-- Name: lead_product_match_runs; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.lead_product_match_runs (
    id bigint NOT NULL,
    lead_id bigint NOT NULL,
    triggered_by bigint,
    products_evaluated smallint DEFAULT '0'::smallint NOT NULL,
    matches_created smallint DEFAULT '0'::smallint NOT NULL,
    ai_calls_made smallint DEFAULT '0'::smallint NOT NULL,
    total_cost_usd numeric(10,6),
    duration_ms integer,
    status character varying(20) DEFAULT 'completed'::character varying NOT NULL,
    error_message text,
    run_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.lead_product_match_runs OWNER TO leads;

--
-- Name: lead_product_match_runs_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.lead_product_match_runs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.lead_product_match_runs_id_seq OWNER TO leads;

--
-- Name: lead_product_match_runs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.lead_product_match_runs_id_seq OWNED BY public.lead_product_match_runs.id;


--
-- Name: lead_product_matches; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.lead_product_matches (
    id bigint NOT NULL,
    lead_id bigint NOT NULL,
    product_id bigint NOT NULL,
    match_score smallint DEFAULT '0'::smallint NOT NULL,
    match_reason text,
    is_recommended boolean DEFAULT false NOT NULL,
    last_matched_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    bant_analysis json,
    reasoning json,
    recommended_approach text,
    competitor_context character varying(1000),
    match_level character varying(20),
    confidence_score smallint,
    ai_provider_used character varying(100),
    ai_model_used character varying(150)
);


ALTER TABLE public.lead_product_matches OWNER TO leads;

--
-- Name: lead_product_matches_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.lead_product_matches_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.lead_product_matches_id_seq OWNER TO leads;

--
-- Name: lead_product_matches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.lead_product_matches_id_seq OWNED BY public.lead_product_matches.id;


--
-- Name: lead_qualifications; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.lead_qualifications (
    id bigint NOT NULL,
    lead_id bigint NOT NULL,
    qualified character varying(255) DEFAULT 'maybe'::character varying NOT NULL,
    business_type character varying(255),
    company_size_band character varying(255),
    qualification_reason text,
    last_qualified_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    classification character varying(255),
    score smallint,
    dimension_breakdown json,
    risk_flags json,
    hard_stops json,
    recommendation text,
    evaluation_snapshot json,
    tenant_id bigint,
    CONSTRAINT lead_qualifications_qualified_check CHECK (((qualified)::text = ANY (ARRAY[('yes'::character varying)::text, ('maybe'::character varying)::text, ('no'::character varying)::text])))
);


ALTER TABLE public.lead_qualifications OWNER TO leads;

--
-- Name: lead_qualifications_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.lead_qualifications_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.lead_qualifications_id_seq OWNER TO leads;

--
-- Name: lead_qualifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.lead_qualifications_id_seq OWNED BY public.lead_qualifications.id;


--
-- Name: lead_revenue_analyses; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.lead_revenue_analyses (
    id bigint NOT NULL,
    lead_id bigint NOT NULL,
    business_type character varying(255),
    use_case text,
    intent_level character varying(255),
    urgency character varying(255),
    probability_to_close numeric(5,2),
    buying_signals json,
    objections json,
    recommended_action text,
    recommended_approach text,
    confidence numeric(4,3),
    reasoning json,
    ai_model character varying(255),
    prompt_tokens integer,
    completion_tokens integer,
    cost_usd numeric(10,6),
    status character varying(255) DEFAULT 'success'::character varying NOT NULL,
    raw_response text,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.lead_revenue_analyses OWNER TO leads;

--
-- Name: lead_revenue_analyses_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.lead_revenue_analyses_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.lead_revenue_analyses_id_seq OWNER TO leads;

--
-- Name: lead_revenue_analyses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.lead_revenue_analyses_id_seq OWNED BY public.lead_revenue_analyses.id;


--
-- Name: lead_score_breakdowns; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.lead_score_breakdowns (
    id bigint NOT NULL,
    tenant_id bigint,
    lead_id bigint NOT NULL,
    factor character varying(100) NOT NULL,
    value character varying(255),
    weight numeric(5,2) DEFAULT '0'::numeric NOT NULL,
    score_contribution numeric(6,2) DEFAULT '0'::numeric NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.lead_score_breakdowns OWNER TO leads;

--
-- Name: lead_score_breakdowns_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.lead_score_breakdowns_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.lead_score_breakdowns_id_seq OWNER TO leads;

--
-- Name: lead_score_breakdowns_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.lead_score_breakdowns_id_seq OWNED BY public.lead_score_breakdowns.id;


--
-- Name: lead_scores; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.lead_scores (
    id bigint NOT NULL,
    lead_id bigint NOT NULL,
    score smallint DEFAULT '0'::smallint NOT NULL,
    grade character varying(255),
    score_breakdown json,
    last_scored_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    tenant_id bigint,
    calculated_at timestamp(0) without time zone,
    CONSTRAINT lead_scores_grade_check CHECK (((grade)::text = ANY (ARRAY[('Hot'::character varying)::text, ('Warm'::character varying)::text, ('Cold'::character varying)::text])))
);


ALTER TABLE public.lead_scores OWNER TO leads;

--
-- Name: lead_scores_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.lead_scores_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.lead_scores_id_seq OWNER TO leads;

--
-- Name: lead_scores_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.lead_scores_id_seq OWNED BY public.lead_scores.id;


--
-- Name: lead_source_types; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.lead_source_types (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    slug character varying(255) NOT NULL,
    description text,
    sort_order smallint DEFAULT '0'::smallint NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.lead_source_types OWNER TO leads;

--
-- Name: lead_source_types_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.lead_source_types_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.lead_source_types_id_seq OWNER TO leads;

--
-- Name: lead_source_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.lead_source_types_id_seq OWNED BY public.lead_source_types.id;


--
-- Name: lead_sources; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.lead_sources (
    id bigint NOT NULL,
    lead_id bigint NOT NULL,
    source_type character varying(255) NOT NULL,
    source_ref character varying(255),
    confidence character varying(255) DEFAULT 'medium'::character varying NOT NULL,
    last_verified_at date,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    tenant_id bigint,
    channel_type_id bigint,
    lark_app_token character varying(255),
    lark_table_id character varying(255),
    CONSTRAINT lead_sources_confidence_check CHECK (((confidence)::text = ANY (ARRAY[('high'::character varying)::text, ('medium'::character varying)::text, ('low'::character varying)::text])))
);


ALTER TABLE public.lead_sources OWNER TO leads;

--
-- Name: lead_sources_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.lead_sources_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.lead_sources_id_seq OWNER TO leads;

--
-- Name: lead_sources_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.lead_sources_id_seq OWNED BY public.lead_sources.id;


--
-- Name: lead_transcripts; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.lead_transcripts (
    id bigint NOT NULL,
    lead_id bigint NOT NULL,
    source_type character varying(255) NOT NULL,
    source_id bigint,
    transcript_text text,
    recorded_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    evaluation_status character varying(255) DEFAULT 'pending'::character varying NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    activity_id bigint,
    title character varying(255),
    file_path character varying(255),
    file_name character varying(255),
    file_mime character varying(255),
    file_size bigint,
    CONSTRAINT lead_transcripts_evaluation_status_check CHECK (((evaluation_status)::text = ANY (ARRAY[('pending'::character varying)::text, ('evaluated'::character varying)::text, ('skipped'::character varying)::text])))
);


ALTER TABLE public.lead_transcripts OWNER TO leads;

--
-- Name: lead_transcripts_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.lead_transcripts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.lead_transcripts_id_seq OWNER TO leads;

--
-- Name: lead_transcripts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.lead_transcripts_id_seq OWNED BY public.lead_transcripts.id;


--
-- Name: leads; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.leads (
    id bigint NOT NULL,
    company_name character varying(255) NOT NULL,
    address text,
    lat numeric(10,7),
    lng numeric(10,7),
    website character varying(255),
    website_domain character varying(255),
    phone character varying(30),
    email character varying(255),
    industry_id bigint,
    sub_industry_id bigint,
    business_category character varying(255),
    company_size_estimate character varying(255),
    branch_count smallint,
    operating_hours character varying(255),
    social_profiles json,
    lead_score smallint,
    qualification_status character varying(255) DEFAULT 'pending'::character varying NOT NULL,
    ai_explanation text,
    duplicate_status character varying(255) DEFAULT 'new'::character varying NOT NULL,
    duplicate_of_id bigint,
    external_place_id character varying(255),
    use_ai_reference boolean DEFAULT false NOT NULL,
    ai_mode character varying(255) DEFAULT 'manual'::character varying NOT NULL,
    ai_reference_source_type character varying(255),
    ai_reference_id bigint,
    ai_processing_status character varying(255),
    funnel_stage_id bigint,
    owner_id bigint,
    territory_id bigint,
    product_id bigint,
    created_by bigint,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    deleted_at timestamp(0) without time zone,
    tenant_id bigint,
    estimated_closing_amount numeric(15,2),
    realized_closing_amount numeric(15,2),
    parent_lead_id bigint,
    presales_owner_id bigint,
    am_owner_id bigint,
    csm_owner_id bigint,
    customer_story text,
    external_id character varying(255),
    lark_base_id character varying(255),
    lark_table_id character varying(255),
    CONSTRAINT leads_ai_mode_check CHECK (((ai_mode)::text = ANY (ARRAY[('full_ai'::character varying)::text, ('hybrid'::character varying)::text, ('manual'::character varying)::text]))),
    CONSTRAINT leads_ai_processing_status_check CHECK (((ai_processing_status)::text = ANY (ARRAY[('pending'::character varying)::text, ('processing'::character varying)::text, ('completed'::character varying)::text, ('failed'::character varying)::text]))),
    CONSTRAINT leads_ai_reference_source_type_check CHECK (((ai_reference_source_type)::text = ANY (ARRAY[('document'::character varying)::text, ('url'::character varying)::text, ('master_product'::character varying)::text]))),
    CONSTRAINT leads_duplicate_status_check CHECK (((duplicate_status)::text = ANY (ARRAY[('new'::character varying)::text, ('exact_duplicate'::character varying)::text, ('probable_duplicate'::character varying)::text, ('existing_new_pic'::character varying)::text, ('manual_review'::character varying)::text]))),
    CONSTRAINT leads_qualification_status_check CHECK (((qualification_status)::text = ANY (ARRAY[('pending'::character varying)::text, ('eligible'::character varying)::text, ('potential'::character varying)::text, ('not_eligible'::character varying)::text])))
);


ALTER TABLE public.leads OWNER TO leads;

--
-- Name: COLUMN leads.lark_base_id; Type: COMMENT; Schema: public; Owner: leads
--

COMMENT ON COLUMN public.leads.lark_base_id IS 'Source Base ID from Lark';


--
-- Name: COLUMN leads.lark_table_id; Type: COMMENT; Schema: public; Owner: leads
--

COMMENT ON COLUMN public.leads.lark_table_id IS 'Source Table ID from Lark';


--
-- Name: leads_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.leads_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.leads_id_seq OWNER TO leads;

--
-- Name: leads_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.leads_id_seq OWNED BY public.leads.id;


--
-- Name: map_candidates; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.map_candidates (
    place_id character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    address text,
    phone character varying(50),
    lat numeric(10,7),
    lng numeric(10,7),
    category character varying(255),
    rating numeric(3,1),
    maps_url text,
    raw_payload json,
    fetched_at timestamp(0) without time zone NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    website character varying(255),
    opening_hours_json json,
    user_ratings_total integer,
    last_enriched_at timestamp(0) without time zone
);


ALTER TABLE public.map_candidates OWNER TO leads;

--
-- Name: map_search_history; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.map_search_history (
    id bigint NOT NULL,
    area_name character varying(255) NOT NULL,
    area_place_id character varying(255),
    area_lat numeric(10,7),
    area_lng numeric(10,7),
    keyword character varying(255),
    category character varying(255),
    search_mode character varying(255) DEFAULT 'nearby'::character varying NOT NULL,
    radius_meters integer,
    result_count integer DEFAULT 0 NOT NULL,
    created_by bigint,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.map_search_history OWNER TO leads;

--
-- Name: map_search_history_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.map_search_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.map_search_history_id_seq OWNER TO leads;

--
-- Name: map_search_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.map_search_history_id_seq OWNED BY public.map_search_history.id;


--
-- Name: migrations; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.migrations (
    id integer NOT NULL,
    migration character varying(255) NOT NULL,
    batch integer NOT NULL
);


ALTER TABLE public.migrations OWNER TO leads;

--
-- Name: migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.migrations_id_seq OWNER TO leads;

--
-- Name: migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.migrations_id_seq OWNED BY public.migrations.id;


--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.password_reset_tokens (
    email character varying(255) NOT NULL,
    token character varying(255) NOT NULL,
    created_at timestamp(0) without time zone
);


ALTER TABLE public.password_reset_tokens OWNER TO leads;

--
-- Name: permissions; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.permissions (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    module character varying(255) NOT NULL,
    display_name character varying(255) NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.permissions OWNER TO leads;

--
-- Name: permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.permissions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.permissions_id_seq OWNER TO leads;

--
-- Name: permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.permissions_id_seq OWNED BY public.permissions.id;


--
-- Name: personal_access_tokens; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.personal_access_tokens (
    id bigint NOT NULL,
    tokenable_type character varying(255) NOT NULL,
    tokenable_id bigint NOT NULL,
    name text NOT NULL,
    token character varying(64) NOT NULL,
    abilities text,
    last_used_at timestamp(0) without time zone,
    expires_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.personal_access_tokens OWNER TO leads;

--
-- Name: personal_access_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.personal_access_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.personal_access_tokens_id_seq OWNER TO leads;

--
-- Name: personal_access_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.personal_access_tokens_id_seq OWNED BY public.personal_access_tokens.id;


--
-- Name: product_questions; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.product_questions (
    id bigint NOT NULL,
    product_id bigint NOT NULL,
    questions json DEFAULT '[]'::json NOT NULL,
    ai_generated boolean DEFAULT false NOT NULL,
    ai_model character varying(255),
    updated_by bigint,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.product_questions OWNER TO leads;

--
-- Name: product_questions_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.product_questions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.product_questions_id_seq OWNER TO leads;

--
-- Name: product_questions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.product_questions_id_seq OWNED BY public.product_questions.id;


--
-- Name: product_tiers; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.product_tiers (
    id bigint NOT NULL,
    product_id bigint NOT NULL,
    name character varying(255) NOT NULL,
    price numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    pricing_type character varying(255) DEFAULT 'flat_rate'::character varying NOT NULL,
    billing_period character varying(255) DEFAULT 'monthly'::character varying NOT NULL,
    subscription_duration_value integer DEFAULT 1 NOT NULL,
    subscription_duration_unit character varying(255) DEFAULT 'month'::character varying NOT NULL,
    features json,
    status character varying(255) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.product_tiers OWNER TO leads;

--
-- Name: product_tiers_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.product_tiers_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.product_tiers_id_seq OWNER TO leads;

--
-- Name: product_tiers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.product_tiers_id_seq OWNED BY public.product_tiers.id;


--
-- Name: products; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.products (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    category character varying(255),
    description text,
    target_industry character varying(255),
    target_pain_points text,
    target_buyer_persona text,
    ideal_company_profile text,
    ai_reference_material text,
    status character varying(255) DEFAULT 'active'::character varying NOT NULL,
    created_by bigint,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    tenant_id bigint,
    supported_regions character varying(500),
    budget_range character varying(255),
    target_company_size character varying(255),
    use_cases json,
    competitor_notes text,
    keywords json,
    CONSTRAINT products_status_check CHECK (((status)::text = ANY (ARRAY[('active'::character varying)::text, ('inactive'::character varying)::text])))
);


ALTER TABLE public.products OWNER TO leads;

--
-- Name: products_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.products_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.products_id_seq OWNER TO leads;

--
-- Name: products_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.products_id_seq OWNED BY public.products.id;


--
-- Name: qualification_parameter_options; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.qualification_parameter_options (
    id bigint NOT NULL,
    parameter_id bigint NOT NULL,
    option_value character varying(255) NOT NULL,
    label character varying(255) NOT NULL,
    score smallint DEFAULT '0'::smallint NOT NULL,
    sort_order smallint DEFAULT '1'::smallint NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    metadata json,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.qualification_parameter_options OWNER TO leads;

--
-- Name: qualification_parameter_options_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.qualification_parameter_options_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.qualification_parameter_options_id_seq OWNER TO leads;

--
-- Name: qualification_parameter_options_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.qualification_parameter_options_id_seq OWNED BY public.qualification_parameter_options.id;


--
-- Name: qualification_parameter_sets; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.qualification_parameter_sets (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    slug character varying(255) NOT NULL,
    version character varying(255) NOT NULL,
    status character varying(255) DEFAULT 'draft'::character varying NOT NULL,
    description text,
    created_by bigint,
    updated_by bigint,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    deleted_at timestamp(0) without time zone,
    tenant_id bigint,
    CONSTRAINT qualification_parameter_sets_status_check CHECK (((status)::text = ANY (ARRAY[('draft'::character varying)::text, ('active'::character varying)::text, ('archived'::character varying)::text])))
);


ALTER TABLE public.qualification_parameter_sets OWNER TO leads;

--
-- Name: qualification_parameter_sets_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.qualification_parameter_sets_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.qualification_parameter_sets_id_seq OWNER TO leads;

--
-- Name: qualification_parameter_sets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.qualification_parameter_sets_id_seq OWNED BY public.qualification_parameter_sets.id;


--
-- Name: qualification_parameters; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.qualification_parameters (
    id bigint NOT NULL,
    parameter_set_id bigint NOT NULL,
    dimension character varying(255) NOT NULL,
    parameter_key character varying(255) NOT NULL,
    label character varying(255) NOT NULL,
    input_type character varying(255) NOT NULL,
    max_points smallint DEFAULT '0'::smallint NOT NULL,
    sort_order smallint DEFAULT '1'::smallint NOT NULL,
    is_required boolean DEFAULT false NOT NULL,
    hard_stop_operator character varying(255),
    hard_stop_value json,
    metadata json,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    CONSTRAINT qualification_parameters_input_type_check CHECK (((input_type)::text = ANY (ARRAY[('enum'::character varying)::text, ('boolean'::character varying)::text, ('integer'::character varying)::text, ('text'::character varying)::text])))
);


ALTER TABLE public.qualification_parameters OWNER TO leads;

--
-- Name: qualification_parameters_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.qualification_parameters_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.qualification_parameters_id_seq OWNER TO leads;

--
-- Name: qualification_parameters_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.qualification_parameters_id_seq OWNED BY public.qualification_parameters.id;


--
-- Name: qualification_workflow_reviews; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.qualification_workflow_reviews (
    id bigint NOT NULL,
    workflow_id bigint NOT NULL,
    lead_id bigint,
    lead_qualification_id bigint,
    status character varying(255) DEFAULT 'pending'::character varying NOT NULL,
    current_stage_code character varying(255),
    recommended_status character varying(255),
    final_status character varying(255),
    requested_by bigint,
    reviewed_by bigint,
    justification text,
    override_reason text,
    review_payload json,
    due_at timestamp(0) without time zone,
    reviewed_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    tenant_id bigint,
    decision character varying(255),
    decision_reason text,
    original_score smallint,
    score_override smallint,
    decisioned_at timestamp(0) without time zone,
    CONSTRAINT qualification_workflow_reviews_status_check CHECK (((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('in_review'::character varying)::text, ('approved'::character varying)::text, ('rejected'::character varying)::text, ('overridden'::character varying)::text])))
);


ALTER TABLE public.qualification_workflow_reviews OWNER TO leads;

--
-- Name: qualification_workflow_reviews_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.qualification_workflow_reviews_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.qualification_workflow_reviews_id_seq OWNER TO leads;

--
-- Name: qualification_workflow_reviews_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.qualification_workflow_reviews_id_seq OWNED BY public.qualification_workflow_reviews.id;


--
-- Name: qualification_workflow_stages; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.qualification_workflow_stages (
    id bigint NOT NULL,
    workflow_id bigint NOT NULL,
    code character varying(255) NOT NULL,
    label character varying(255) NOT NULL,
    sequence smallint DEFAULT '1'::smallint NOT NULL,
    assigned_role character varying(255),
    decision_type character varying(255) DEFAULT 'review'::character varying NOT NULL,
    is_required boolean DEFAULT true NOT NULL,
    metadata json,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.qualification_workflow_stages OWNER TO leads;

--
-- Name: qualification_workflow_stages_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.qualification_workflow_stages_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.qualification_workflow_stages_id_seq OWNER TO leads;

--
-- Name: qualification_workflow_stages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.qualification_workflow_stages_id_seq OWNED BY public.qualification_workflow_stages.id;


--
-- Name: qualification_workflows; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.qualification_workflows (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    slug character varying(255) NOT NULL,
    trigger_status character varying(255) DEFAULT 'need_review'::character varying NOT NULL,
    requires_approval boolean DEFAULT true NOT NULL,
    override_enabled boolean DEFAULT true NOT NULL,
    sla_hours smallint,
    is_active boolean DEFAULT true NOT NULL,
    created_by bigint,
    updated_by bigint,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    deleted_at timestamp(0) without time zone,
    tenant_id bigint
);


ALTER TABLE public.qualification_workflows OWNER TO leads;

--
-- Name: qualification_workflows_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.qualification_workflows_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.qualification_workflows_id_seq OWNER TO leads;

--
-- Name: qualification_workflows_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.qualification_workflows_id_seq OWNED BY public.qualification_workflows.id;


--
-- Name: record_origin_mappings; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.record_origin_mappings (
    id bigint NOT NULL,
    tenant_id bigint,
    source_system character varying(100) NOT NULL,
    source_schema character varying(100) DEFAULT 'public'::character varying NOT NULL,
    source_table character varying(100) NOT NULL,
    source_record_id character varying(255) NOT NULL,
    target_table character varying(100) NOT NULL,
    target_record_id character varying(255) NOT NULL,
    metadata json,
    imported_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.record_origin_mappings OWNER TO leads;

--
-- Name: record_origin_mappings_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.record_origin_mappings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.record_origin_mappings_id_seq OWNER TO leads;

--
-- Name: record_origin_mappings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.record_origin_mappings_id_seq OWNED BY public.record_origin_mappings.id;


--
-- Name: revenue_rules; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.revenue_rules (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    condition_type character varying(255) NOT NULL,
    condition_value json NOT NULL,
    action character varying(255) NOT NULL,
    severity character varying(255) DEFAULT 'warning'::character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    priority integer DEFAULT 10 NOT NULL,
    created_by bigint,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    tenant_id bigint
);


ALTER TABLE public.revenue_rules OWNER TO leads;

--
-- Name: revenue_rules_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.revenue_rules_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.revenue_rules_id_seq OWNER TO leads;

--
-- Name: revenue_rules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.revenue_rules_id_seq OWNED BY public.revenue_rules.id;


--
-- Name: role_permission; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.role_permission (
    id bigint NOT NULL,
    role_id bigint NOT NULL,
    permission_id bigint NOT NULL
);


ALTER TABLE public.role_permission OWNER TO leads;

--
-- Name: role_permission_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.role_permission_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.role_permission_id_seq OWNER TO leads;

--
-- Name: role_permission_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.role_permission_id_seq OWNED BY public.role_permission.id;


--
-- Name: roles; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.roles (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    display_name character varying(255) NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.roles OWNER TO leads;

--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.roles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.roles_id_seq OWNER TO leads;

--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: sales_visit_media; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.sales_visit_media (
    id bigint NOT NULL,
    sales_visit_id bigint NOT NULL,
    uploaded_by bigint,
    media_type character varying(40) NOT NULL,
    disk character varying(255) DEFAULT 'public'::character varying NOT NULL,
    path character varying(255) NOT NULL,
    mime_type character varying(255),
    size_bytes bigint,
    lat numeric(10,7),
    lng numeric(10,7),
    accuracy_m integer,
    captured_at timestamp(0) without time zone,
    metadata json,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.sales_visit_media OWNER TO leads;

--
-- Name: sales_visit_media_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.sales_visit_media_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.sales_visit_media_id_seq OWNER TO leads;

--
-- Name: sales_visit_media_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.sales_visit_media_id_seq OWNED BY public.sales_visit_media.id;


--
-- Name: sales_visits; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.sales_visits (
    id bigint NOT NULL,
    lead_id bigint NOT NULL,
    user_id bigint NOT NULL,
    status character varying(40) DEFAULT 'in_progress'::character varying NOT NULL,
    clock_in_at timestamp(0) without time zone,
    clock_out_at timestamp(0) without time zone,
    clock_in_lat numeric(10,7),
    clock_in_lng numeric(10,7),
    clock_out_lat numeric(10,7),
    clock_out_lng numeric(10,7),
    clock_in_accuracy_m integer,
    clock_out_accuracy_m integer,
    clock_in_distance_m integer,
    clock_out_distance_m integer,
    risk_status character varying(40) DEFAULT 'verified'::character varying NOT NULL,
    risk_signals json,
    device_metadata json,
    visit_result character varying(80),
    notes text,
    client_name character varying(255),
    client_title character varying(255),
    signature_captured_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.sales_visits OWNER TO leads;

--
-- Name: sales_visits_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.sales_visits_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.sales_visits_id_seq OWNER TO leads;

--
-- Name: sales_visits_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.sales_visits_id_seq OWNED BY public.sales_visits.id;


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.sessions (
    id character varying(255) NOT NULL,
    user_id bigint,
    ip_address character varying(45),
    user_agent text,
    payload text NOT NULL,
    last_activity integer NOT NULL
);


ALTER TABLE public.sessions OWNER TO leads;

--
-- Name: sub_industries; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.sub_industries (
    id bigint NOT NULL,
    industry_id bigint NOT NULL,
    name character varying(255) NOT NULL,
    synonyms json,
    scoring_hints text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.sub_industries OWNER TO leads;

--
-- Name: sub_industries_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.sub_industries_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.sub_industries_id_seq OWNER TO leads;

--
-- Name: sub_industries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.sub_industries_id_seq OWNED BY public.sub_industries.id;


--
-- Name: tenants; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.tenants (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    slug character varying(255) NOT NULL,
    status character varying(255) DEFAULT 'active'::character varying NOT NULL,
    metadata json,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    deleted_at timestamp(0) without time zone,
    CONSTRAINT tenants_status_check CHECK (((status)::text = ANY (ARRAY[('active'::character varying)::text, ('inactive'::character varying)::text])))
);


ALTER TABLE public.tenants OWNER TO leads;

--
-- Name: tenants_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.tenants_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.tenants_id_seq OWNER TO leads;

--
-- Name: tenants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.tenants_id_seq OWNED BY public.tenants.id;


--
-- Name: territories; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.territories (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    center_lat numeric(10,7) NOT NULL,
    center_lng numeric(10,7) NOT NULL,
    radius_meters integer NOT NULL,
    metadata json,
    created_by bigint,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    tenant_id bigint
);


ALTER TABLE public.territories OWNER TO leads;

--
-- Name: territories_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.territories_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.territories_id_seq OWNER TO leads;

--
-- Name: territories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.territories_id_seq OWNED BY public.territories.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.users (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    email_verified_at timestamp(0) without time zone,
    password character varying(255) NOT NULL,
    role_id bigint,
    phone character varying(30),
    is_active boolean DEFAULT true NOT NULL,
    remember_token character varying(100),
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    tenant_id bigint,
    direct_manager_id bigint,
    target_period character varying(255) DEFAULT 'monthly'::character varying NOT NULL,
    target_revenue numeric(15,2),
    tier_level character varying(50) DEFAULT 'JR_AE'::character varying NOT NULL,
    buffer_rate numeric(5,2) DEFAULT '20'::numeric NOT NULL,
    target_percentage numeric(5,2) DEFAULT '100'::numeric NOT NULL,
    target_calculation_type character varying(50) DEFAULT 'amount'::character varying NOT NULL,
    CONSTRAINT users_target_period_check CHECK (((target_period)::text = ANY (ARRAY[('weekly'::character varying)::text, ('monthly'::character varying)::text, ('quarterly'::character varying)::text, ('yearly'::character varying)::text])))
);


ALTER TABLE public.users OWNER TO leads;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.users_id_seq OWNER TO leads;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: whatsapp_ai_analyses; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.whatsapp_ai_analyses (
    id bigint NOT NULL,
    conversation_id bigint NOT NULL,
    provider character varying(255),
    analysis_result character varying(255) NOT NULL,
    confidence_score double precision,
    reasoning_summary text,
    analyzed_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.whatsapp_ai_analyses OWNER TO leads;

--
-- Name: whatsapp_ai_analyses_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.whatsapp_ai_analyses_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.whatsapp_ai_analyses_id_seq OWNER TO leads;

--
-- Name: whatsapp_ai_analyses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.whatsapp_ai_analyses_id_seq OWNED BY public.whatsapp_ai_analyses.id;


--
-- Name: whatsapp_campaign_recipients; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.whatsapp_campaign_recipients (
    id bigint NOT NULL,
    campaign_id bigint NOT NULL,
    lead_id bigint,
    phone_number character varying(255) NOT NULL,
    send_status character varying(255) DEFAULT 'pending'::character varying NOT NULL,
    provider_response_json json,
    sent_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.whatsapp_campaign_recipients OWNER TO leads;

--
-- Name: whatsapp_campaign_recipients_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.whatsapp_campaign_recipients_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.whatsapp_campaign_recipients_id_seq OWNER TO leads;

--
-- Name: whatsapp_campaign_recipients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.whatsapp_campaign_recipients_id_seq OWNED BY public.whatsapp_campaign_recipients.id;


--
-- Name: whatsapp_campaigns; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.whatsapp_campaigns (
    id bigint NOT NULL,
    campaign_name character varying(255) NOT NULL,
    message_template text NOT NULL,
    total_targets integer DEFAULT 0 NOT NULL,
    status character varying(255) DEFAULT 'draft'::character varying NOT NULL,
    executed_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.whatsapp_campaigns OWNER TO leads;

--
-- Name: whatsapp_campaigns_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.whatsapp_campaigns_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.whatsapp_campaigns_id_seq OWNER TO leads;

--
-- Name: whatsapp_campaigns_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.whatsapp_campaigns_id_seq OWNED BY public.whatsapp_campaigns.id;


--
-- Name: whatsapp_contacts; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.whatsapp_contacts (
    id bigint NOT NULL,
    name character varying(255),
    phone_number character varying(255) NOT NULL,
    normalized_phone_number character varying(255),
    linked_lead_id bigint,
    is_relevant boolean DEFAULT false NOT NULL,
    relevance_reason character varying(255),
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    user_id bigint
);


ALTER TABLE public.whatsapp_contacts OWNER TO leads;

--
-- Name: whatsapp_contacts_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.whatsapp_contacts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.whatsapp_contacts_id_seq OWNER TO leads;

--
-- Name: whatsapp_contacts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.whatsapp_contacts_id_seq OWNED BY public.whatsapp_contacts.id;


--
-- Name: whatsapp_conversations; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.whatsapp_conversations (
    id bigint NOT NULL,
    contact_id bigint NOT NULL,
    external_chat_id character varying(255) NOT NULL,
    sync_status character varying(255) DEFAULT 'active'::character varying NOT NULL,
    relevance_status character varying(255) DEFAULT 'pending'::character varying NOT NULL,
    approved_for_sync boolean DEFAULT false NOT NULL,
    last_message_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    platform character varying(255) DEFAULT 'whatsapp'::character varying NOT NULL,
    user_id bigint
);


ALTER TABLE public.whatsapp_conversations OWNER TO leads;

--
-- Name: whatsapp_conversations_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.whatsapp_conversations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.whatsapp_conversations_id_seq OWNER TO leads;

--
-- Name: whatsapp_conversations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.whatsapp_conversations_id_seq OWNED BY public.whatsapp_conversations.id;


--
-- Name: whatsapp_messages; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.whatsapp_messages (
    id bigint NOT NULL,
    conversation_id bigint NOT NULL,
    external_message_id character varying(255) NOT NULL,
    direction character varying(255) NOT NULL,
    message_type character varying(255) DEFAULT 'text'::character varying NOT NULL,
    body text,
    reply_to_external_message_id character varying(255),
    provider_payload_json json,
    relevance_flag boolean DEFAULT false NOT NULL,
    sent_at timestamp(0) without time zone,
    received_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    CONSTRAINT whatsapp_messages_direction_check CHECK (((direction)::text = ANY (ARRAY[('inbound'::character varying)::text, ('outbound'::character varying)::text])))
);


ALTER TABLE public.whatsapp_messages OWNER TO leads;

--
-- Name: whatsapp_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.whatsapp_messages_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.whatsapp_messages_id_seq OWNER TO leads;

--
-- Name: whatsapp_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.whatsapp_messages_id_seq OWNED BY public.whatsapp_messages.id;


--
-- Name: whatsapp_sessions; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.whatsapp_sessions (
    id bigint NOT NULL,
    session_name character varying(255) NOT NULL,
    status character varying(255) DEFAULT 'disconnected'::character varying NOT NULL,
    qr_payload text,
    last_qr_generated_at timestamp(0) without time zone,
    connected_at timestamp(0) without time zone,
    disconnected_at timestamp(0) without time zone,
    metadata_json json,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.whatsapp_sessions OWNER TO leads;

--
-- Name: whatsapp_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.whatsapp_sessions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.whatsapp_sessions_id_seq OWNER TO leads;

--
-- Name: whatsapp_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.whatsapp_sessions_id_seq OWNED BY public.whatsapp_sessions.id;


--
-- Name: whatsapp_sync_rules; Type: TABLE; Schema: public; Owner: leads
--

CREATE TABLE public.whatsapp_sync_rules (
    id bigint NOT NULL,
    rule_type character varying(255) NOT NULL,
    rule_key character varying(255),
    rule_value character varying(255),
    enabled boolean DEFAULT true NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.whatsapp_sync_rules OWNER TO leads;

--
-- Name: whatsapp_sync_rules_id_seq; Type: SEQUENCE; Schema: public; Owner: leads
--

CREATE SEQUENCE public.whatsapp_sync_rules_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.whatsapp_sync_rules_id_seq OWNER TO leads;

--
-- Name: whatsapp_sync_rules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leads
--

ALTER SEQUENCE public.whatsapp_sync_rules_id_seq OWNED BY public.whatsapp_sync_rules.id;


--
-- Name: ai_connection_tests id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.ai_connection_tests ALTER COLUMN id SET DEFAULT nextval('public.ai_connection_tests_id_seq'::regclass);


--
-- Name: ai_feature_routes id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.ai_feature_routes ALTER COLUMN id SET DEFAULT nextval('public.ai_feature_routes_id_seq'::regclass);


--
-- Name: ai_model_routes id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.ai_model_routes ALTER COLUMN id SET DEFAULT nextval('public.ai_model_routes_id_seq'::regclass);


--
-- Name: ai_models id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.ai_models ALTER COLUMN id SET DEFAULT nextval('public.ai_models_id_seq'::regclass);


--
-- Name: ai_prompt_template_versions id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.ai_prompt_template_versions ALTER COLUMN id SET DEFAULT nextval('public.ai_prompt_template_versions_id_seq'::regclass);


--
-- Name: ai_prompt_templates id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.ai_prompt_templates ALTER COLUMN id SET DEFAULT nextval('public.ai_prompt_templates_id_seq'::regclass);


--
-- Name: ai_providers id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.ai_providers ALTER COLUMN id SET DEFAULT nextval('public.ai_providers_id_seq'::regclass);


--
-- Name: ai_requests id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.ai_requests ALTER COLUMN id SET DEFAULT nextval('public.ai_requests_id_seq'::regclass);


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: contact_enrichment_candidates id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.contact_enrichment_candidates ALTER COLUMN id SET DEFAULT nextval('public.contact_enrichment_candidates_id_seq'::regclass);


--
-- Name: contact_sources id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.contact_sources ALTER COLUMN id SET DEFAULT nextval('public.contact_sources_id_seq'::regclass);


--
-- Name: currencies id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.currencies ALTER COLUMN id SET DEFAULT nextval('public.currencies_id_seq'::regclass);


--
-- Name: currency_settings id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.currency_settings ALTER COLUMN id SET DEFAULT nextval('public.currency_settings_id_seq'::regclass);


--
-- Name: discovery_categories id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.discovery_categories ALTER COLUMN id SET DEFAULT nextval('public.discovery_categories_id_seq'::regclass);


--
-- Name: email_verification_otps id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.email_verification_otps ALTER COLUMN id SET DEFAULT nextval('public.email_verification_otps_id_seq'::regclass);


--
-- Name: failed_jobs id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.failed_jobs ALTER COLUMN id SET DEFAULT nextval('public.failed_jobs_id_seq'::regclass);


--
-- Name: funnel_stages id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.funnel_stages ALTER COLUMN id SET DEFAULT nextval('public.funnel_stages_id_seq'::regclass);


--
-- Name: geo_product_fit_analyses id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.geo_product_fit_analyses ALTER COLUMN id SET DEFAULT nextval('public.geo_product_fit_analyses_id_seq'::regclass);


--
-- Name: icp_profiles id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.icp_profiles ALTER COLUMN id SET DEFAULT nextval('public.icp_profiles_id_seq'::regclass);


--
-- Name: industries id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.industries ALTER COLUMN id SET DEFAULT nextval('public.industries_id_seq'::regclass);


--
-- Name: integration_configs id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.integration_configs ALTER COLUMN id SET DEFAULT nextval('public.integration_configs_id_seq'::regclass);


--
-- Name: integration_connections id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.integration_connections ALTER COLUMN id SET DEFAULT nextval('public.integration_connections_id_seq'::regclass);


--
-- Name: integration_credential_stores id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.integration_credential_stores ALTER COLUMN id SET DEFAULT nextval('public.integration_credential_stores_id_seq'::regclass);


--
-- Name: integration_entity_mappings id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.integration_entity_mappings ALTER COLUMN id SET DEFAULT nextval('public.integration_entity_mappings_id_seq'::regclass);


--
-- Name: integration_webhook_events id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.integration_webhook_events ALTER COLUMN id SET DEFAULT nextval('public.integration_webhook_events_id_seq'::regclass);


--
-- Name: jobs id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.jobs ALTER COLUMN id SET DEFAULT nextval('public.jobs_id_seq'::regclass);


--
-- Name: lark_base_record_mappings id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lark_base_record_mappings ALTER COLUMN id SET DEFAULT nextval('public.lark_base_record_mappings_id_seq'::regclass);


--
-- Name: lark_base_tables id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lark_base_tables ALTER COLUMN id SET DEFAULT nextval('public.lark_base_tables_id_seq'::regclass);


--
-- Name: lark_events id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lark_events ALTER COLUMN id SET DEFAULT nextval('public.lark_events_id_seq'::regclass);


--
-- Name: lark_integrations id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lark_integrations ALTER COLUMN id SET DEFAULT nextval('public.lark_integrations_id_seq'::regclass);


--
-- Name: lark_sso_users id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lark_sso_users ALTER COLUMN id SET DEFAULT nextval('public.lark_sso_users_id_seq'::regclass);


--
-- Name: lark_syncs id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lark_syncs ALTER COLUMN id SET DEFAULT nextval('public.lark_syncs_id_seq'::regclass);


--
-- Name: lead_activities id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_activities ALTER COLUMN id SET DEFAULT nextval('public.lead_activities_id_seq'::regclass);


--
-- Name: lead_ai_analyses id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_ai_analyses ALTER COLUMN id SET DEFAULT nextval('public.lead_ai_analyses_id_seq'::regclass);


--
-- Name: lead_ai_evaluations id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_ai_evaluations ALTER COLUMN id SET DEFAULT nextval('public.lead_ai_evaluations_id_seq'::regclass);


--
-- Name: lead_analysis_logs id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_analysis_logs ALTER COLUMN id SET DEFAULT nextval('public.lead_analysis_logs_id_seq'::regclass);


--
-- Name: lead_bantc_question_guides id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_bantc_question_guides ALTER COLUMN id SET DEFAULT nextval('public.lead_bantc_question_guides_id_seq'::regclass);


--
-- Name: lead_channel_types id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_channel_types ALTER COLUMN id SET DEFAULT nextval('public.lead_channel_types_id_seq'::regclass);


--
-- Name: lead_contact_payloads id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_contact_payloads ALTER COLUMN id SET DEFAULT nextval('public.lead_contact_payloads_id_seq'::regclass);


--
-- Name: lead_contacts id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_contacts ALTER COLUMN id SET DEFAULT nextval('public.lead_contacts_id_seq'::regclass);


--
-- Name: lead_conversion_predictions id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_conversion_predictions ALTER COLUMN id SET DEFAULT nextval('public.lead_conversion_predictions_id_seq'::regclass);


--
-- Name: lead_follow_ups id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_follow_ups ALTER COLUMN id SET DEFAULT nextval('public.lead_follow_ups_id_seq'::regclass);


--
-- Name: lead_funnel_history id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_funnel_history ALTER COLUMN id SET DEFAULT nextval('public.lead_funnel_history_id_seq'::regclass);


--
-- Name: lead_icp_config id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_icp_config ALTER COLUMN id SET DEFAULT nextval('public.lead_icp_config_id_seq'::regclass);


--
-- Name: lead_icp_matches id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_icp_matches ALTER COLUMN id SET DEFAULT nextval('public.lead_icp_matches_id_seq'::regclass);


--
-- Name: lead_meetings id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_meetings ALTER COLUMN id SET DEFAULT nextval('public.lead_meetings_id_seq'::regclass);


--
-- Name: lead_outcomes id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_outcomes ALTER COLUMN id SET DEFAULT nextval('public.lead_outcomes_id_seq'::regclass);


--
-- Name: lead_pre_meeting_briefs id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_pre_meeting_briefs ALTER COLUMN id SET DEFAULT nextval('public.lead_pre_meeting_briefs_id_seq'::regclass);


--
-- Name: lead_prescriptions id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_prescriptions ALTER COLUMN id SET DEFAULT nextval('public.lead_prescriptions_id_seq'::regclass);


--
-- Name: lead_product_match_runs id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_product_match_runs ALTER COLUMN id SET DEFAULT nextval('public.lead_product_match_runs_id_seq'::regclass);


--
-- Name: lead_product_matches id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_product_matches ALTER COLUMN id SET DEFAULT nextval('public.lead_product_matches_id_seq'::regclass);


--
-- Name: lead_qualifications id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_qualifications ALTER COLUMN id SET DEFAULT nextval('public.lead_qualifications_id_seq'::regclass);


--
-- Name: lead_revenue_analyses id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_revenue_analyses ALTER COLUMN id SET DEFAULT nextval('public.lead_revenue_analyses_id_seq'::regclass);


--
-- Name: lead_score_breakdowns id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_score_breakdowns ALTER COLUMN id SET DEFAULT nextval('public.lead_score_breakdowns_id_seq'::regclass);


--
-- Name: lead_scores id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_scores ALTER COLUMN id SET DEFAULT nextval('public.lead_scores_id_seq'::regclass);


--
-- Name: lead_source_types id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_source_types ALTER COLUMN id SET DEFAULT nextval('public.lead_source_types_id_seq'::regclass);


--
-- Name: lead_sources id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_sources ALTER COLUMN id SET DEFAULT nextval('public.lead_sources_id_seq'::regclass);


--
-- Name: lead_transcripts id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_transcripts ALTER COLUMN id SET DEFAULT nextval('public.lead_transcripts_id_seq'::regclass);


--
-- Name: leads id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.leads ALTER COLUMN id SET DEFAULT nextval('public.leads_id_seq'::regclass);


--
-- Name: map_search_history id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.map_search_history ALTER COLUMN id SET DEFAULT nextval('public.map_search_history_id_seq'::regclass);


--
-- Name: migrations id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.migrations ALTER COLUMN id SET DEFAULT nextval('public.migrations_id_seq'::regclass);


--
-- Name: permissions id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.permissions ALTER COLUMN id SET DEFAULT nextval('public.permissions_id_seq'::regclass);


--
-- Name: personal_access_tokens id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.personal_access_tokens ALTER COLUMN id SET DEFAULT nextval('public.personal_access_tokens_id_seq'::regclass);


--
-- Name: product_questions id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.product_questions ALTER COLUMN id SET DEFAULT nextval('public.product_questions_id_seq'::regclass);


--
-- Name: product_tiers id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.product_tiers ALTER COLUMN id SET DEFAULT nextval('public.product_tiers_id_seq'::regclass);


--
-- Name: products id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.products ALTER COLUMN id SET DEFAULT nextval('public.products_id_seq'::regclass);


--
-- Name: qualification_parameter_options id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.qualification_parameter_options ALTER COLUMN id SET DEFAULT nextval('public.qualification_parameter_options_id_seq'::regclass);


--
-- Name: qualification_parameter_sets id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.qualification_parameter_sets ALTER COLUMN id SET DEFAULT nextval('public.qualification_parameter_sets_id_seq'::regclass);


--
-- Name: qualification_parameters id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.qualification_parameters ALTER COLUMN id SET DEFAULT nextval('public.qualification_parameters_id_seq'::regclass);


--
-- Name: qualification_workflow_reviews id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.qualification_workflow_reviews ALTER COLUMN id SET DEFAULT nextval('public.qualification_workflow_reviews_id_seq'::regclass);


--
-- Name: qualification_workflow_stages id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.qualification_workflow_stages ALTER COLUMN id SET DEFAULT nextval('public.qualification_workflow_stages_id_seq'::regclass);


--
-- Name: qualification_workflows id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.qualification_workflows ALTER COLUMN id SET DEFAULT nextval('public.qualification_workflows_id_seq'::regclass);


--
-- Name: record_origin_mappings id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.record_origin_mappings ALTER COLUMN id SET DEFAULT nextval('public.record_origin_mappings_id_seq'::regclass);


--
-- Name: revenue_rules id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.revenue_rules ALTER COLUMN id SET DEFAULT nextval('public.revenue_rules_id_seq'::regclass);


--
-- Name: role_permission id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.role_permission ALTER COLUMN id SET DEFAULT nextval('public.role_permission_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: sales_visit_media id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.sales_visit_media ALTER COLUMN id SET DEFAULT nextval('public.sales_visit_media_id_seq'::regclass);


--
-- Name: sales_visits id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.sales_visits ALTER COLUMN id SET DEFAULT nextval('public.sales_visits_id_seq'::regclass);


--
-- Name: sub_industries id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.sub_industries ALTER COLUMN id SET DEFAULT nextval('public.sub_industries_id_seq'::regclass);


--
-- Name: tenants id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.tenants ALTER COLUMN id SET DEFAULT nextval('public.tenants_id_seq'::regclass);


--
-- Name: territories id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.territories ALTER COLUMN id SET DEFAULT nextval('public.territories_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: whatsapp_ai_analyses id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.whatsapp_ai_analyses ALTER COLUMN id SET DEFAULT nextval('public.whatsapp_ai_analyses_id_seq'::regclass);


--
-- Name: whatsapp_campaign_recipients id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.whatsapp_campaign_recipients ALTER COLUMN id SET DEFAULT nextval('public.whatsapp_campaign_recipients_id_seq'::regclass);


--
-- Name: whatsapp_campaigns id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.whatsapp_campaigns ALTER COLUMN id SET DEFAULT nextval('public.whatsapp_campaigns_id_seq'::regclass);


--
-- Name: whatsapp_contacts id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.whatsapp_contacts ALTER COLUMN id SET DEFAULT nextval('public.whatsapp_contacts_id_seq'::regclass);


--
-- Name: whatsapp_conversations id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.whatsapp_conversations ALTER COLUMN id SET DEFAULT nextval('public.whatsapp_conversations_id_seq'::regclass);


--
-- Name: whatsapp_messages id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.whatsapp_messages ALTER COLUMN id SET DEFAULT nextval('public.whatsapp_messages_id_seq'::regclass);


--
-- Name: whatsapp_sessions id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.whatsapp_sessions ALTER COLUMN id SET DEFAULT nextval('public.whatsapp_sessions_id_seq'::regclass);


--
-- Name: whatsapp_sync_rules id; Type: DEFAULT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.whatsapp_sync_rules ALTER COLUMN id SET DEFAULT nextval('public.whatsapp_sync_rules_id_seq'::regclass);


--
-- Name: ai_parameter_suggestions ai_parameter_suggestions_pkey; Type: CONSTRAINT; Schema: legacy_mgmt; Owner: leads
--

ALTER TABLE ONLY legacy_mgmt.ai_parameter_suggestions
    ADD CONSTRAINT ai_parameter_suggestions_pkey PRIMARY KEY (id);


--
-- Name: ai_provider_settings ai_provider_settings_pkey; Type: CONSTRAINT; Schema: legacy_mgmt; Owner: leads
--

ALTER TABLE ONLY legacy_mgmt.ai_provider_settings
    ADD CONSTRAINT ai_provider_settings_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: legacy_mgmt; Owner: leads
--

ALTER TABLE ONLY legacy_mgmt.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: evaluation_overrides evaluation_overrides_pkey; Type: CONSTRAINT; Schema: legacy_mgmt; Owner: leads
--

ALTER TABLE ONLY legacy_mgmt.evaluation_overrides
    ADD CONSTRAINT evaluation_overrides_pkey PRIMARY KEY (id);


--
-- Name: lead_activities lead_activities_pkey; Type: CONSTRAINT; Schema: legacy_mgmt; Owner: leads
--

ALTER TABLE ONLY legacy_mgmt.lead_activities
    ADD CONSTRAINT lead_activities_pkey PRIMARY KEY (id);


--
-- Name: lead_evaluations lead_evaluations_pkey; Type: CONSTRAINT; Schema: legacy_mgmt; Owner: leads
--

ALTER TABLE ONLY legacy_mgmt.lead_evaluations
    ADD CONSTRAINT lead_evaluations_pkey PRIMARY KEY (id);


--
-- Name: lead_scores lead_scores_pkey; Type: CONSTRAINT; Schema: legacy_mgmt; Owner: leads
--

ALTER TABLE ONLY legacy_mgmt.lead_scores
    ADD CONSTRAINT lead_scores_pkey PRIMARY KEY (id);


--
-- Name: lead_sources lead_sources_pkey; Type: CONSTRAINT; Schema: legacy_mgmt; Owner: leads
--

ALTER TABLE ONLY legacy_mgmt.lead_sources
    ADD CONSTRAINT lead_sources_pkey PRIMARY KEY (id);


--
-- Name: leads leads_pkey; Type: CONSTRAINT; Schema: legacy_mgmt; Owner: leads
--

ALTER TABLE ONLY legacy_mgmt.leads
    ADD CONSTRAINT leads_pkey PRIMARY KEY (id);


--
-- Name: parameter_options parameter_options_pkey; Type: CONSTRAINT; Schema: legacy_mgmt; Owner: leads
--

ALTER TABLE ONLY legacy_mgmt.parameter_options
    ADD CONSTRAINT parameter_options_pkey PRIMARY KEY (id);


--
-- Name: parameters parameters_pkey; Type: CONSTRAINT; Schema: legacy_mgmt; Owner: leads
--

ALTER TABLE ONLY legacy_mgmt.parameters
    ADD CONSTRAINT parameters_pkey PRIMARY KEY (id);


--
-- Name: product_questions product_questions_pkey; Type: CONSTRAINT; Schema: legacy_mgmt; Owner: leads
--

ALTER TABLE ONLY legacy_mgmt.product_questions
    ADD CONSTRAINT product_questions_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: legacy_mgmt; Owner: leads
--

ALTER TABLE ONLY legacy_mgmt.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: legacy_mgmt; Owner: leads
--

ALTER TABLE ONLY legacy_mgmt.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: scoring_dimensions scoring_dimensions_pkey; Type: CONSTRAINT; Schema: legacy_mgmt; Owner: leads
--

ALTER TABLE ONLY legacy_mgmt.scoring_dimensions
    ADD CONSTRAINT scoring_dimensions_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: legacy_mgmt; Owner: leads
--

ALTER TABLE ONLY legacy_mgmt.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: ai_connection_tests ai_connection_tests_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.ai_connection_tests
    ADD CONSTRAINT ai_connection_tests_pkey PRIMARY KEY (id);


--
-- Name: ai_feature_routes ai_feature_routes_feature_name_priority_unique; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.ai_feature_routes
    ADD CONSTRAINT ai_feature_routes_feature_name_priority_unique UNIQUE (feature_name, priority);


--
-- Name: ai_feature_routes ai_feature_routes_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.ai_feature_routes
    ADD CONSTRAINT ai_feature_routes_pkey PRIMARY KEY (id);


--
-- Name: ai_model_routes ai_model_routes_function_name_unique; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.ai_model_routes
    ADD CONSTRAINT ai_model_routes_function_name_unique UNIQUE (function_name);


--
-- Name: ai_model_routes ai_model_routes_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.ai_model_routes
    ADD CONSTRAINT ai_model_routes_pkey PRIMARY KEY (id);


--
-- Name: ai_models ai_models_ai_provider_id_name_unique; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.ai_models
    ADD CONSTRAINT ai_models_ai_provider_id_name_unique UNIQUE (ai_provider_id, name);


--
-- Name: ai_models ai_models_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.ai_models
    ADD CONSTRAINT ai_models_pkey PRIMARY KEY (id);


--
-- Name: ai_prompt_template_versions ai_prompt_template_versions_ai_prompt_template_id_version_uniqu; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.ai_prompt_template_versions
    ADD CONSTRAINT ai_prompt_template_versions_ai_prompt_template_id_version_uniqu UNIQUE (ai_prompt_template_id, version);


--
-- Name: ai_prompt_template_versions ai_prompt_template_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.ai_prompt_template_versions
    ADD CONSTRAINT ai_prompt_template_versions_pkey PRIMARY KEY (id);


--
-- Name: ai_prompt_templates ai_prompt_templates_feature_name_template_name_unique; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.ai_prompt_templates
    ADD CONSTRAINT ai_prompt_templates_feature_name_template_name_unique UNIQUE (feature_name, template_name);


--
-- Name: ai_prompt_templates ai_prompt_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.ai_prompt_templates
    ADD CONSTRAINT ai_prompt_templates_pkey PRIMARY KEY (id);


--
-- Name: ai_providers ai_providers_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.ai_providers
    ADD CONSTRAINT ai_providers_pkey PRIMARY KEY (id);


--
-- Name: ai_providers ai_providers_slug_unique; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.ai_providers
    ADD CONSTRAINT ai_providers_slug_unique UNIQUE (slug);


--
-- Name: ai_requests ai_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.ai_requests
    ADD CONSTRAINT ai_requests_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: cache_locks cache_locks_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.cache_locks
    ADD CONSTRAINT cache_locks_pkey PRIMARY KEY (key);


--
-- Name: cache cache_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.cache
    ADD CONSTRAINT cache_pkey PRIMARY KEY (key);


--
-- Name: contact_enrichment_candidates contact_enrichment_candidates_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.contact_enrichment_candidates
    ADD CONSTRAINT contact_enrichment_candidates_pkey PRIMARY KEY (id);


--
-- Name: contact_sources contact_sources_name_unique; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.contact_sources
    ADD CONSTRAINT contact_sources_name_unique UNIQUE (name);


--
-- Name: contact_sources contact_sources_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.contact_sources
    ADD CONSTRAINT contact_sources_pkey PRIMARY KEY (id);


--
-- Name: currencies currencies_code_unique; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.currencies
    ADD CONSTRAINT currencies_code_unique UNIQUE (code);


--
-- Name: currencies currencies_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.currencies
    ADD CONSTRAINT currencies_pkey PRIMARY KEY (id);


--
-- Name: currency_settings currency_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.currency_settings
    ADD CONSTRAINT currency_settings_pkey PRIMARY KEY (id);


--
-- Name: currency_settings currency_settings_tenant_id_unique; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.currency_settings
    ADD CONSTRAINT currency_settings_tenant_id_unique UNIQUE (tenant_id);


--
-- Name: discovery_categories discovery_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.discovery_categories
    ADD CONSTRAINT discovery_categories_pkey PRIMARY KEY (id);


--
-- Name: discovery_categories discovery_categories_value_unique; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.discovery_categories
    ADD CONSTRAINT discovery_categories_value_unique UNIQUE (value);


--
-- Name: email_verification_otps email_verification_otps_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.email_verification_otps
    ADD CONSTRAINT email_verification_otps_pkey PRIMARY KEY (id);


--
-- Name: failed_jobs failed_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.failed_jobs
    ADD CONSTRAINT failed_jobs_pkey PRIMARY KEY (id);


--
-- Name: failed_jobs failed_jobs_uuid_unique; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.failed_jobs
    ADD CONSTRAINT failed_jobs_uuid_unique UNIQUE (uuid);


--
-- Name: funnel_stages funnel_stages_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.funnel_stages
    ADD CONSTRAINT funnel_stages_pkey PRIMARY KEY (id);


--
-- Name: geo_product_fit_analyses geo_fit_place_product_unique; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.geo_product_fit_analyses
    ADD CONSTRAINT geo_fit_place_product_unique UNIQUE (place_id, product_id);


--
-- Name: geo_product_fit_analyses geo_product_fit_analyses_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.geo_product_fit_analyses
    ADD CONSTRAINT geo_product_fit_analyses_pkey PRIMARY KEY (id);


--
-- Name: icp_profiles icp_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.icp_profiles
    ADD CONSTRAINT icp_profiles_pkey PRIMARY KEY (id);


--
-- Name: industries industries_name_unique; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.industries
    ADD CONSTRAINT industries_name_unique UNIQUE (name);


--
-- Name: industries industries_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.industries
    ADD CONSTRAINT industries_pkey PRIMARY KEY (id);


--
-- Name: integration_configs integration_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.integration_configs
    ADD CONSTRAINT integration_configs_pkey PRIMARY KEY (id);


--
-- Name: integration_connections integration_connections_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.integration_connections
    ADD CONSTRAINT integration_connections_pkey PRIMARY KEY (id);


--
-- Name: integration_connections integration_connections_provider_account_unique; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.integration_connections
    ADD CONSTRAINT integration_connections_provider_account_unique UNIQUE (tenant_id, provider, provider_account_id);


--
-- Name: integration_credential_stores integration_credential_stores_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.integration_credential_stores
    ADD CONSTRAINT integration_credential_stores_pkey PRIMARY KEY (id);


--
-- Name: integration_entity_mappings integration_entity_external_unique; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.integration_entity_mappings
    ADD CONSTRAINT integration_entity_external_unique UNIQUE (integration_connection_id, external_entity_type, external_entity_id);


--
-- Name: integration_entity_mappings integration_entity_leadsy_unique; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.integration_entity_mappings
    ADD CONSTRAINT integration_entity_leadsy_unique UNIQUE (integration_connection_id, leadsy_entity_type, leadsy_entity_id);


--
-- Name: integration_entity_mappings integration_entity_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.integration_entity_mappings
    ADD CONSTRAINT integration_entity_mappings_pkey PRIMARY KEY (id);


--
-- Name: integration_webhook_events integration_webhook_events_idempotency_key_unique; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.integration_webhook_events
    ADD CONSTRAINT integration_webhook_events_idempotency_key_unique UNIQUE (idempotency_key);


--
-- Name: integration_webhook_events integration_webhook_events_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.integration_webhook_events
    ADD CONSTRAINT integration_webhook_events_pkey PRIMARY KEY (id);


--
-- Name: job_batches job_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.job_batches
    ADD CONSTRAINT job_batches_pkey PRIMARY KEY (id);


--
-- Name: jobs jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_pkey PRIMARY KEY (id);


--
-- Name: lark_base_record_mappings lark_base_record_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lark_base_record_mappings
    ADD CONSTRAINT lark_base_record_mappings_pkey PRIMARY KEY (id);


--
-- Name: lark_base_record_mappings lark_base_record_unique_lark; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lark_base_record_mappings
    ADD CONSTRAINT lark_base_record_unique_lark UNIQUE (lark_base_table_id, lark_record_id);


--
-- Name: lark_base_record_mappings lark_base_record_unique_leadsy; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lark_base_record_mappings
    ADD CONSTRAINT lark_base_record_unique_leadsy UNIQUE (lark_base_table_id, leadsy_entity_type, leadsy_entity_id);


--
-- Name: lark_base_tables lark_base_tables_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lark_base_tables
    ADD CONSTRAINT lark_base_tables_pkey PRIMARY KEY (id);


--
-- Name: lark_base_tables lark_base_tables_unique_table; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lark_base_tables
    ADD CONSTRAINT lark_base_tables_unique_table UNIQUE (tenant_id, app_token, table_id);


--
-- Name: lark_events lark_events_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lark_events
    ADD CONSTRAINT lark_events_pkey PRIMARY KEY (id);


--
-- Name: lark_integrations lark_integrations_app_id_unique; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lark_integrations
    ADD CONSTRAINT lark_integrations_app_id_unique UNIQUE (app_id);


--
-- Name: lark_integrations lark_integrations_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lark_integrations
    ADD CONSTRAINT lark_integrations_pkey PRIMARY KEY (id);


--
-- Name: lark_sso_users lark_sso_users_lark_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lark_sso_users
    ADD CONSTRAINT lark_sso_users_lark_user_id_unique UNIQUE (lark_user_id);


--
-- Name: lark_sso_users lark_sso_users_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lark_sso_users
    ADD CONSTRAINT lark_sso_users_pkey PRIMARY KEY (id);


--
-- Name: lark_syncs lark_syncs_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lark_syncs
    ADD CONSTRAINT lark_syncs_pkey PRIMARY KEY (id);


--
-- Name: lead_activities lead_activities_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_activities
    ADD CONSTRAINT lead_activities_pkey PRIMARY KEY (id);


--
-- Name: lead_ai_analyses lead_ai_analyses_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_ai_analyses
    ADD CONSTRAINT lead_ai_analyses_pkey PRIMARY KEY (id);


--
-- Name: lead_ai_evaluations lead_ai_evaluations_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_ai_evaluations
    ADD CONSTRAINT lead_ai_evaluations_pkey PRIMARY KEY (id);


--
-- Name: lead_analysis_logs lead_analysis_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_analysis_logs
    ADD CONSTRAINT lead_analysis_logs_pkey PRIMARY KEY (id);


--
-- Name: lead_bantc_question_guides lead_bantc_question_guides_lead_id_unique; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_bantc_question_guides
    ADD CONSTRAINT lead_bantc_question_guides_lead_id_unique UNIQUE (lead_id);


--
-- Name: lead_bantc_question_guides lead_bantc_question_guides_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_bantc_question_guides
    ADD CONSTRAINT lead_bantc_question_guides_pkey PRIMARY KEY (id);


--
-- Name: lead_channel_types lead_channel_types_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_channel_types
    ADD CONSTRAINT lead_channel_types_pkey PRIMARY KEY (id);


--
-- Name: lead_channel_types lead_channel_types_slug_unique; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_channel_types
    ADD CONSTRAINT lead_channel_types_slug_unique UNIQUE (slug);


--
-- Name: lead_contact_payloads lead_contact_payloads_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_contact_payloads
    ADD CONSTRAINT lead_contact_payloads_pkey PRIMARY KEY (id);


--
-- Name: lead_contacts lead_contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_contacts
    ADD CONSTRAINT lead_contacts_pkey PRIMARY KEY (id);


--
-- Name: lead_conversion_predictions lead_conversion_predictions_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_conversion_predictions
    ADD CONSTRAINT lead_conversion_predictions_pkey PRIMARY KEY (id);


--
-- Name: lead_follow_ups lead_follow_ups_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_follow_ups
    ADD CONSTRAINT lead_follow_ups_pkey PRIMARY KEY (id);


--
-- Name: lead_funnel_history lead_funnel_history_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_funnel_history
    ADD CONSTRAINT lead_funnel_history_pkey PRIMARY KEY (id);


--
-- Name: lead_icp_config lead_icp_config_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_icp_config
    ADD CONSTRAINT lead_icp_config_pkey PRIMARY KEY (id);


--
-- Name: lead_icp_matches lead_icp_matches_lead_id_icp_profile_id_unique; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_icp_matches
    ADD CONSTRAINT lead_icp_matches_lead_id_icp_profile_id_unique UNIQUE (lead_id, icp_profile_id);


--
-- Name: lead_icp_matches lead_icp_matches_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_icp_matches
    ADD CONSTRAINT lead_icp_matches_pkey PRIMARY KEY (id);


--
-- Name: lead_meetings lead_meetings_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_meetings
    ADD CONSTRAINT lead_meetings_pkey PRIMARY KEY (id);


--
-- Name: lead_outcomes lead_outcomes_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_outcomes
    ADD CONSTRAINT lead_outcomes_pkey PRIMARY KEY (id);


--
-- Name: lead_pre_meeting_briefs lead_pre_meeting_briefs_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_pre_meeting_briefs
    ADD CONSTRAINT lead_pre_meeting_briefs_pkey PRIMARY KEY (id);


--
-- Name: lead_prescriptions lead_prescriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_prescriptions
    ADD CONSTRAINT lead_prescriptions_pkey PRIMARY KEY (id);


--
-- Name: lead_product_match_runs lead_product_match_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_product_match_runs
    ADD CONSTRAINT lead_product_match_runs_pkey PRIMARY KEY (id);


--
-- Name: lead_product_matches lead_product_matches_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_product_matches
    ADD CONSTRAINT lead_product_matches_pkey PRIMARY KEY (id);


--
-- Name: contact_enrichment_candidates lead_provider_candidate_unique; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.contact_enrichment_candidates
    ADD CONSTRAINT lead_provider_candidate_unique UNIQUE (lead_id, provider, provider_candidate_id);


--
-- Name: lead_qualifications lead_qualifications_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_qualifications
    ADD CONSTRAINT lead_qualifications_pkey PRIMARY KEY (id);


--
-- Name: lead_revenue_analyses lead_revenue_analyses_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_revenue_analyses
    ADD CONSTRAINT lead_revenue_analyses_pkey PRIMARY KEY (id);


--
-- Name: lead_score_breakdowns lead_score_breakdowns_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_score_breakdowns
    ADD CONSTRAINT lead_score_breakdowns_pkey PRIMARY KEY (id);


--
-- Name: lead_scores lead_scores_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_scores
    ADD CONSTRAINT lead_scores_pkey PRIMARY KEY (id);


--
-- Name: lead_source_types lead_source_types_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_source_types
    ADD CONSTRAINT lead_source_types_pkey PRIMARY KEY (id);


--
-- Name: lead_source_types lead_source_types_slug_unique; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_source_types
    ADD CONSTRAINT lead_source_types_slug_unique UNIQUE (slug);


--
-- Name: lead_sources lead_sources_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_sources
    ADD CONSTRAINT lead_sources_pkey PRIMARY KEY (id);


--
-- Name: lead_transcripts lead_transcripts_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_transcripts
    ADD CONSTRAINT lead_transcripts_pkey PRIMARY KEY (id);


--
-- Name: leads leads_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_pkey PRIMARY KEY (id);


--
-- Name: map_candidates map_candidates_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.map_candidates
    ADD CONSTRAINT map_candidates_pkey PRIMARY KEY (place_id);


--
-- Name: map_search_history map_search_history_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.map_search_history
    ADD CONSTRAINT map_search_history_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (email);


--
-- Name: permissions permissions_name_unique; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_name_unique UNIQUE (name);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: personal_access_tokens personal_access_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.personal_access_tokens
    ADD CONSTRAINT personal_access_tokens_pkey PRIMARY KEY (id);


--
-- Name: personal_access_tokens personal_access_tokens_token_unique; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.personal_access_tokens
    ADD CONSTRAINT personal_access_tokens_token_unique UNIQUE (token);


--
-- Name: product_questions product_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.product_questions
    ADD CONSTRAINT product_questions_pkey PRIMARY KEY (id);


--
-- Name: product_questions product_questions_product_id_unique; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.product_questions
    ADD CONSTRAINT product_questions_product_id_unique UNIQUE (product_id);


--
-- Name: product_tiers product_tiers_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.product_tiers
    ADD CONSTRAINT product_tiers_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: qualification_parameter_options qualification_parameter_options_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.qualification_parameter_options
    ADD CONSTRAINT qualification_parameter_options_pkey PRIMARY KEY (id);


--
-- Name: qualification_parameter_sets qualification_parameter_sets_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.qualification_parameter_sets
    ADD CONSTRAINT qualification_parameter_sets_pkey PRIMARY KEY (id);


--
-- Name: qualification_parameter_sets qualification_parameter_sets_slug_unique; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.qualification_parameter_sets
    ADD CONSTRAINT qualification_parameter_sets_slug_unique UNIQUE (slug);


--
-- Name: qualification_parameters qualification_parameters_parameter_set_id_parameter_key_unique; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.qualification_parameters
    ADD CONSTRAINT qualification_parameters_parameter_set_id_parameter_key_unique UNIQUE (parameter_set_id, parameter_key);


--
-- Name: qualification_parameters qualification_parameters_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.qualification_parameters
    ADD CONSTRAINT qualification_parameters_pkey PRIMARY KEY (id);


--
-- Name: qualification_workflow_reviews qualification_workflow_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.qualification_workflow_reviews
    ADD CONSTRAINT qualification_workflow_reviews_pkey PRIMARY KEY (id);


--
-- Name: qualification_workflow_stages qualification_workflow_stages_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.qualification_workflow_stages
    ADD CONSTRAINT qualification_workflow_stages_pkey PRIMARY KEY (id);


--
-- Name: qualification_workflow_stages qualification_workflow_stages_workflow_id_code_unique; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.qualification_workflow_stages
    ADD CONSTRAINT qualification_workflow_stages_workflow_id_code_unique UNIQUE (workflow_id, code);


--
-- Name: qualification_workflows qualification_workflows_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.qualification_workflows
    ADD CONSTRAINT qualification_workflows_pkey PRIMARY KEY (id);


--
-- Name: qualification_workflows qualification_workflows_slug_unique; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.qualification_workflows
    ADD CONSTRAINT qualification_workflows_slug_unique UNIQUE (slug);


--
-- Name: record_origin_mappings record_origin_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.record_origin_mappings
    ADD CONSTRAINT record_origin_mappings_pkey PRIMARY KEY (id);


--
-- Name: record_origin_mappings record_origin_source_unique; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.record_origin_mappings
    ADD CONSTRAINT record_origin_source_unique UNIQUE (source_system, source_schema, source_table, source_record_id);


--
-- Name: record_origin_mappings record_origin_target_unique; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.record_origin_mappings
    ADD CONSTRAINT record_origin_target_unique UNIQUE (target_table, target_record_id);


--
-- Name: revenue_rules revenue_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.revenue_rules
    ADD CONSTRAINT revenue_rules_pkey PRIMARY KEY (id);


--
-- Name: role_permission role_permission_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.role_permission
    ADD CONSTRAINT role_permission_pkey PRIMARY KEY (id);


--
-- Name: role_permission role_permission_role_id_permission_id_unique; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.role_permission
    ADD CONSTRAINT role_permission_role_id_permission_id_unique UNIQUE (role_id, permission_id);


--
-- Name: roles roles_name_unique; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_unique UNIQUE (name);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: sales_visit_media sales_visit_media_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.sales_visit_media
    ADD CONSTRAINT sales_visit_media_pkey PRIMARY KEY (id);


--
-- Name: sales_visits sales_visits_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.sales_visits
    ADD CONSTRAINT sales_visits_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: sub_industries sub_industries_industry_id_name_unique; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.sub_industries
    ADD CONSTRAINT sub_industries_industry_id_name_unique UNIQUE (industry_id, name);


--
-- Name: sub_industries sub_industries_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.sub_industries
    ADD CONSTRAINT sub_industries_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_slug_unique; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_slug_unique UNIQUE (slug);


--
-- Name: territories territories_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.territories
    ADD CONSTRAINT territories_pkey PRIMARY KEY (id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_ai_analyses whatsapp_ai_analyses_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.whatsapp_ai_analyses
    ADD CONSTRAINT whatsapp_ai_analyses_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_campaign_recipients whatsapp_campaign_recipients_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.whatsapp_campaign_recipients
    ADD CONSTRAINT whatsapp_campaign_recipients_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_campaigns whatsapp_campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.whatsapp_campaigns
    ADD CONSTRAINT whatsapp_campaigns_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_contacts whatsapp_contacts_phone_number_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.whatsapp_contacts
    ADD CONSTRAINT whatsapp_contacts_phone_number_user_id_unique UNIQUE (phone_number, user_id);


--
-- Name: whatsapp_contacts whatsapp_contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.whatsapp_contacts
    ADD CONSTRAINT whatsapp_contacts_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_conversations whatsapp_conversations_external_chat_id_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.whatsapp_conversations
    ADD CONSTRAINT whatsapp_conversations_external_chat_id_user_id_unique UNIQUE (external_chat_id, user_id);


--
-- Name: whatsapp_conversations whatsapp_conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.whatsapp_conversations
    ADD CONSTRAINT whatsapp_conversations_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_messages whatsapp_messages_external_message_id_unique; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.whatsapp_messages
    ADD CONSTRAINT whatsapp_messages_external_message_id_unique UNIQUE (external_message_id);


--
-- Name: whatsapp_messages whatsapp_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.whatsapp_messages
    ADD CONSTRAINT whatsapp_messages_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_sessions whatsapp_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.whatsapp_sessions
    ADD CONSTRAINT whatsapp_sessions_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_sessions whatsapp_sessions_session_name_unique; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.whatsapp_sessions
    ADD CONSTRAINT whatsapp_sessions_session_name_unique UNIQUE (session_name);


--
-- Name: whatsapp_sync_rules whatsapp_sync_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.whatsapp_sync_rules
    ADD CONSTRAINT whatsapp_sync_rules_pkey PRIMARY KEY (id);


--
-- Name: ai_parameter_suggestions_product_id_idx; Type: INDEX; Schema: legacy_mgmt; Owner: leads
--

CREATE INDEX ai_parameter_suggestions_product_id_idx ON legacy_mgmt.ai_parameter_suggestions USING btree (product_id);


--
-- Name: ai_provider_settings_is_active_idx; Type: INDEX; Schema: legacy_mgmt; Owner: leads
--

CREATE INDEX ai_provider_settings_is_active_idx ON legacy_mgmt.ai_provider_settings USING btree (is_active);


--
-- Name: ai_provider_settings_user_id_idx; Type: INDEX; Schema: legacy_mgmt; Owner: leads
--

CREATE INDEX ai_provider_settings_user_id_idx ON legacy_mgmt.ai_provider_settings USING btree (user_id);


--
-- Name: ai_provider_settings_user_id_provider_name_key; Type: INDEX; Schema: legacy_mgmt; Owner: leads
--

CREATE UNIQUE INDEX ai_provider_settings_user_id_provider_name_key ON legacy_mgmt.ai_provider_settings USING btree (user_id, provider_name);


--
-- Name: audit_logs_entity_type_entity_id_idx; Type: INDEX; Schema: legacy_mgmt; Owner: leads
--

CREATE INDEX audit_logs_entity_type_entity_id_idx ON legacy_mgmt.audit_logs USING btree (entity_type, entity_id);


--
-- Name: audit_logs_user_id_created_at_idx; Type: INDEX; Schema: legacy_mgmt; Owner: leads
--

CREATE INDEX audit_logs_user_id_created_at_idx ON legacy_mgmt.audit_logs USING btree (user_id, created_at DESC);


--
-- Name: lead_activities_lead_id_created_at_idx; Type: INDEX; Schema: legacy_mgmt; Owner: leads
--

CREATE INDEX lead_activities_lead_id_created_at_idx ON legacy_mgmt.lead_activities USING btree (lead_id, created_at DESC);


--
-- Name: lead_evaluations_lead_id_idx; Type: INDEX; Schema: legacy_mgmt; Owner: leads
--

CREATE INDEX lead_evaluations_lead_id_idx ON legacy_mgmt.lead_evaluations USING btree (lead_id);


--
-- Name: lead_evaluations_lead_id_is_latest_idx; Type: INDEX; Schema: legacy_mgmt; Owner: leads
--

CREATE INDEX lead_evaluations_lead_id_is_latest_idx ON legacy_mgmt.lead_evaluations USING btree (lead_id, is_latest);


--
-- Name: lead_scores_evaluation_id_idx; Type: INDEX; Schema: legacy_mgmt; Owner: leads
--

CREATE INDEX lead_scores_evaluation_id_idx ON legacy_mgmt.lead_scores USING btree (evaluation_id);


--
-- Name: lead_sources_name_key; Type: INDEX; Schema: legacy_mgmt; Owner: leads
--

CREATE UNIQUE INDEX lead_sources_name_key ON legacy_mgmt.lead_sources USING btree (name);


--
-- Name: leads_company_name_idx; Type: INDEX; Schema: legacy_mgmt; Owner: leads
--

CREATE INDEX leads_company_name_idx ON legacy_mgmt.leads USING btree (company_name);


--
-- Name: leads_created_at_idx; Type: INDEX; Schema: legacy_mgmt; Owner: leads
--

CREATE INDEX leads_created_at_idx ON legacy_mgmt.leads USING btree (created_at DESC);


--
-- Name: leads_status_idx; Type: INDEX; Schema: legacy_mgmt; Owner: leads
--

CREATE INDEX leads_status_idx ON legacy_mgmt.leads USING btree (status);


--
-- Name: leads_tenant_id_idx; Type: INDEX; Schema: legacy_mgmt; Owner: leads
--

CREATE INDEX leads_tenant_id_idx ON legacy_mgmt.leads USING btree (tenant_id);


--
-- Name: parameters_dimension_id_key_key; Type: INDEX; Schema: legacy_mgmt; Owner: leads
--

CREATE UNIQUE INDEX parameters_dimension_id_key_key ON legacy_mgmt.parameters USING btree (dimension_id, key);


--
-- Name: product_questions_product_id_idx; Type: INDEX; Schema: legacy_mgmt; Owner: leads
--

CREATE INDEX product_questions_product_id_idx ON legacy_mgmt.product_questions USING btree (product_id);


--
-- Name: roles_name_key; Type: INDEX; Schema: legacy_mgmt; Owner: leads
--

CREATE UNIQUE INDEX roles_name_key ON legacy_mgmt.roles USING btree (name);


--
-- Name: scoring_dimensions_key_key; Type: INDEX; Schema: legacy_mgmt; Owner: leads
--

CREATE UNIQUE INDEX scoring_dimensions_key_key ON legacy_mgmt.scoring_dimensions USING btree (key);


--
-- Name: users_email_key; Type: INDEX; Schema: legacy_mgmt; Owner: leads
--

CREATE UNIQUE INDEX users_email_key ON legacy_mgmt.users USING btree (email);


--
-- Name: ai_feature_routes_feature_name_index; Type: INDEX; Schema: public; Owner: leads
--

CREATE INDEX ai_feature_routes_feature_name_index ON public.ai_feature_routes USING btree (feature_name);


--
-- Name: ai_prompt_templates_feature_name_index; Type: INDEX; Schema: public; Owner: leads
--

CREATE INDEX ai_prompt_templates_feature_name_index ON public.ai_prompt_templates USING btree (feature_name);


--
-- Name: audit_logs_module_created_at_index; Type: INDEX; Schema: public; Owner: leads
--

CREATE INDEX audit_logs_module_created_at_index ON public.audit_logs USING btree (module, created_at);


--
-- Name: audit_logs_record_type_record_id_index; Type: INDEX; Schema: public; Owner: leads
--

CREATE INDEX audit_logs_record_type_record_id_index ON public.audit_logs USING btree (record_type, record_id);


--
-- Name: audit_logs_tenant_id_index; Type: INDEX; Schema: public; Owner: leads
--

CREATE INDEX audit_logs_tenant_id_index ON public.audit_logs USING btree (tenant_id);


--
-- Name: contact_candidates_lead_provider_status_idx; Type: INDEX; Schema: public; Owner: leads
--

CREATE INDEX contact_candidates_lead_provider_status_idx ON public.contact_enrichment_candidates USING btree (lead_id, provider, status);


--
-- Name: email_verification_otps_email_index; Type: INDEX; Schema: public; Owner: leads
--

CREATE INDEX email_verification_otps_email_index ON public.email_verification_otps USING btree (email);


--
-- Name: geo_product_fit_analyses_fit_level_index; Type: INDEX; Schema: public; Owner: leads
--

CREATE INDEX geo_product_fit_analyses_fit_level_index ON public.geo_product_fit_analyses USING btree (fit_level);


--
-- Name: geo_product_fit_analyses_fit_score_index; Type: INDEX; Schema: public; Owner: leads
--

CREATE INDEX geo_product_fit_analyses_fit_score_index ON public.geo_product_fit_analyses USING btree (fit_score);


--
-- Name: geo_product_fit_analyses_place_id_index; Type: INDEX; Schema: public; Owner: leads
--

CREATE INDEX geo_product_fit_analyses_place_id_index ON public.geo_product_fit_analyses USING btree (place_id);


--
-- Name: geo_product_fit_analyses_product_id_index; Type: INDEX; Schema: public; Owner: leads
--

CREATE INDEX geo_product_fit_analyses_product_id_index ON public.geo_product_fit_analyses USING btree (product_id);


--
-- Name: icp_profiles_tenant_id_index; Type: INDEX; Schema: public; Owner: leads
--

CREATE INDEX icp_profiles_tenant_id_index ON public.icp_profiles USING btree (tenant_id);


--
-- Name: integration_configs_category_index; Type: INDEX; Schema: public; Owner: leads
--

CREATE INDEX integration_configs_category_index ON public.integration_configs USING btree (category);


--
-- Name: integration_configs_tenant_id_index; Type: INDEX; Schema: public; Owner: leads
--

CREATE INDEX integration_configs_tenant_id_index ON public.integration_configs USING btree (tenant_id);


--
-- Name: integration_configs_tenant_key_unique; Type: INDEX; Schema: public; Owner: leads
--

CREATE UNIQUE INDEX integration_configs_tenant_key_unique ON public.integration_configs USING btree (COALESCE(tenant_id, (0)::bigint), key);


--
-- Name: integration_connections_enabled_idx; Type: INDEX; Schema: public; Owner: leads
--

CREATE INDEX integration_connections_enabled_idx ON public.integration_connections USING btree (tenant_id, is_enabled);


--
-- Name: integration_connections_status_idx; Type: INDEX; Schema: public; Owner: leads
--

CREATE INDEX integration_connections_status_idx ON public.integration_connections USING btree (tenant_id, provider, status);


--
-- Name: integration_credentials_fingerprint_idx; Type: INDEX; Schema: public; Owner: leads
--

CREATE INDEX integration_credentials_fingerprint_idx ON public.integration_credential_stores USING btree (value_fingerprint);


--
-- Name: integration_credentials_key_idx; Type: INDEX; Schema: public; Owner: leads
--

CREATE INDEX integration_credentials_key_idx ON public.integration_credential_stores USING btree (integration_connection_id, key_name);


--
-- Name: integration_credentials_rotation_idx; Type: INDEX; Schema: public; Owner: leads
--

CREATE INDEX integration_credentials_rotation_idx ON public.integration_credential_stores USING btree (expires_at, revoked_at);


--
-- Name: integration_credentials_type_idx; Type: INDEX; Schema: public; Owner: leads
--

CREATE INDEX integration_credentials_type_idx ON public.integration_credential_stores USING btree (tenant_id, credential_type);


--
-- Name: integration_entity_leadsy_idx; Type: INDEX; Schema: public; Owner: leads
--

CREATE INDEX integration_entity_leadsy_idx ON public.integration_entity_mappings USING btree (tenant_id, leadsy_entity_type, leadsy_entity_id);


--
-- Name: integration_webhooks_status_idx; Type: INDEX; Schema: public; Owner: leads
--

CREATE INDEX integration_webhooks_status_idx ON public.integration_webhook_events USING btree (provider, status, received_at);


--
-- Name: integration_webhooks_tenant_provider_idx; Type: INDEX; Schema: public; Owner: leads
--

CREATE INDEX integration_webhooks_tenant_provider_idx ON public.integration_webhook_events USING btree (tenant_id, provider);


--
-- Name: jobs_queue_index; Type: INDEX; Schema: public; Owner: leads
--

CREATE INDEX jobs_queue_index ON public.jobs USING btree (queue);


--
-- Name: lark_base_record_leadsy_idx; Type: INDEX; Schema: public; Owner: leads
--

CREATE INDEX lark_base_record_leadsy_idx ON public.lark_base_record_mappings USING btree (tenant_id, leadsy_entity_type, leadsy_entity_id);


--
-- Name: lark_base_tables_entity_idx; Type: INDEX; Schema: public; Owner: leads
--

CREATE INDEX lark_base_tables_entity_idx ON public.lark_base_tables USING btree (tenant_id, leadsy_entity_type, is_active);


--
-- Name: lead_activities_related_entity_type_related_entity_id_index; Type: INDEX; Schema: public; Owner: leads
--

CREATE INDEX lead_activities_related_entity_type_related_entity_id_index ON public.lead_activities USING btree (related_entity_type, related_entity_id);


--
-- Name: lead_activities_tenant_id_index; Type: INDEX; Schema: public; Owner: leads
--

CREATE INDEX lead_activities_tenant_id_index ON public.lead_activities USING btree (tenant_id);


--
-- Name: lead_ai_evaluations_source_type_source_id_index; Type: INDEX; Schema: public; Owner: leads
--

CREATE INDEX lead_ai_evaluations_source_type_source_id_index ON public.lead_ai_evaluations USING btree (source_type, source_id);


--
-- Name: lead_analysis_logs_lead_type_idx; Type: INDEX; Schema: public; Owner: leads
--

CREATE INDEX lead_analysis_logs_lead_type_idx ON public.lead_analysis_logs USING btree (lead_id, analysis_type);


--
-- Name: lead_analysis_logs_tenant_created_idx; Type: INDEX; Schema: public; Owner: leads
--

CREATE INDEX lead_analysis_logs_tenant_created_idx ON public.lead_analysis_logs USING btree (tenant_id, created_at);


--
-- Name: lead_contacts_one_primary_per_lead; Type: INDEX; Schema: public; Owner: leads
--

CREATE UNIQUE INDEX lead_contacts_one_primary_per_lead ON public.lead_contacts USING btree (lead_id) WHERE (is_primary = true);


--
-- Name: lead_icp_config_tenant_industry_idx; Type: INDEX; Schema: public; Owner: leads
--

CREATE INDEX lead_icp_config_tenant_industry_idx ON public.lead_icp_config USING btree (tenant_id, industry);


--
-- Name: lead_icp_config_tenant_location_idx; Type: INDEX; Schema: public; Owner: leads
--

CREATE INDEX lead_icp_config_tenant_location_idx ON public.lead_icp_config USING btree (tenant_id, location);


--
-- Name: lead_product_match_runs_lead_id_index; Type: INDEX; Schema: public; Owner: leads
--

CREATE INDEX lead_product_match_runs_lead_id_index ON public.lead_product_match_runs USING btree (lead_id);


--
-- Name: lead_product_match_runs_run_at_index; Type: INDEX; Schema: public; Owner: leads
--

CREATE INDEX lead_product_match_runs_run_at_index ON public.lead_product_match_runs USING btree (run_at);


--
-- Name: lead_qualifications_latest_idx; Type: INDEX; Schema: public; Owner: leads
--

CREATE INDEX lead_qualifications_latest_idx ON public.lead_qualifications USING btree (lead_id, last_qualified_at DESC);


--
-- Name: lead_qualifications_tenant_id_index; Type: INDEX; Schema: public; Owner: leads
--

CREATE INDEX lead_qualifications_tenant_id_index ON public.lead_qualifications USING btree (tenant_id);


--
-- Name: lead_score_breakdowns_lead_factor_idx; Type: INDEX; Schema: public; Owner: leads
--

CREATE INDEX lead_score_breakdowns_lead_factor_idx ON public.lead_score_breakdowns USING btree (lead_id, factor);


--
-- Name: lead_score_breakdowns_tenant_lead_idx; Type: INDEX; Schema: public; Owner: leads
--

CREATE INDEX lead_score_breakdowns_tenant_lead_idx ON public.lead_score_breakdowns USING btree (tenant_id, lead_id);


--
-- Name: lead_scores_calculated_at_idx; Type: INDEX; Schema: public; Owner: leads
--

CREATE INDEX lead_scores_calculated_at_idx ON public.lead_scores USING btree (lead_id, calculated_at);


--
-- Name: lead_scores_latest_idx; Type: INDEX; Schema: public; Owner: leads
--

CREATE INDEX lead_scores_latest_idx ON public.lead_scores USING btree (lead_id, last_scored_at DESC);


--
-- Name: lead_scores_tenant_id_index; Type: INDEX; Schema: public; Owner: leads
--

CREATE INDEX lead_scores_tenant_id_index ON public.lead_scores USING btree (tenant_id);


--
-- Name: lead_sources_identity_unique; Type: INDEX; Schema: public; Owner: leads
--

CREATE UNIQUE INDEX lead_sources_identity_unique ON public.lead_sources USING btree (lead_id, source_type, COALESCE(source_ref, ''::character varying));


--
-- Name: lead_sources_tenant_id_index; Type: INDEX; Schema: public; Owner: leads
--

CREATE INDEX lead_sources_tenant_id_index ON public.lead_sources USING btree (tenant_id);


--
-- Name: leads_external_id_index; Type: INDEX; Schema: public; Owner: leads
--

CREATE INDEX leads_external_id_index ON public.leads USING btree (external_id);


--
-- Name: leads_external_place_id_index; Type: INDEX; Schema: public; Owner: leads
--

CREATE INDEX leads_external_place_id_index ON public.leads USING btree (external_place_id);


--
-- Name: leads_operational_filter_idx; Type: INDEX; Schema: public; Owner: leads
--

CREATE INDEX leads_operational_filter_idx ON public.leads USING btree (qualification_status, funnel_stage_id, lead_score, created_at);


--
-- Name: leads_tenant_id_index; Type: INDEX; Schema: public; Owner: leads
--

CREATE INDEX leads_tenant_id_index ON public.leads USING btree (tenant_id);


--
-- Name: leads_website_domain_index; Type: INDEX; Schema: public; Owner: leads
--

CREATE INDEX leads_website_domain_index ON public.leads USING btree (website_domain);


--
-- Name: personal_access_tokens_expires_at_index; Type: INDEX; Schema: public; Owner: leads
--

CREATE INDEX personal_access_tokens_expires_at_index ON public.personal_access_tokens USING btree (expires_at);


--
-- Name: personal_access_tokens_tokenable_type_tokenable_id_index; Type: INDEX; Schema: public; Owner: leads
--

CREATE INDEX personal_access_tokens_tokenable_type_tokenable_id_index ON public.personal_access_tokens USING btree (tokenable_type, tokenable_id);


--
-- Name: products_tenant_id_index; Type: INDEX; Schema: public; Owner: leads
--

CREATE INDEX products_tenant_id_index ON public.products USING btree (tenant_id);


--
-- Name: qualification_parameter_sets_one_active_per_tenant; Type: INDEX; Schema: public; Owner: leads
--

CREATE UNIQUE INDEX qualification_parameter_sets_one_active_per_tenant ON public.qualification_parameter_sets USING btree (COALESCE(tenant_id, (0)::bigint)) WHERE (((status)::text = 'active'::text) AND (deleted_at IS NULL));


--
-- Name: qualification_parameter_sets_tenant_id_index; Type: INDEX; Schema: public; Owner: leads
--

CREATE INDEX qualification_parameter_sets_tenant_id_index ON public.qualification_parameter_sets USING btree (tenant_id);


--
-- Name: qualification_workflow_reviews_tenant_id_index; Type: INDEX; Schema: public; Owner: leads
--

CREATE INDEX qualification_workflow_reviews_tenant_id_index ON public.qualification_workflow_reviews USING btree (tenant_id);


--
-- Name: qualification_workflows_active_trigger_per_tenant; Type: INDEX; Schema: public; Owner: leads
--

CREATE UNIQUE INDEX qualification_workflows_active_trigger_per_tenant ON public.qualification_workflows USING btree (COALESCE(tenant_id, (0)::bigint), trigger_status) WHERE ((is_active = true) AND (deleted_at IS NULL));


--
-- Name: qualification_workflows_tenant_id_index; Type: INDEX; Schema: public; Owner: leads
--

CREATE INDEX qualification_workflows_tenant_id_index ON public.qualification_workflows USING btree (tenant_id);


--
-- Name: qwr_lead_status_idx; Type: INDEX; Schema: public; Owner: leads
--

CREATE INDEX qwr_lead_status_idx ON public.qualification_workflow_reviews USING btree (lead_id, status);


--
-- Name: qwr_status_decision_idx; Type: INDEX; Schema: public; Owner: leads
--

CREATE INDEX qwr_status_decision_idx ON public.qualification_workflow_reviews USING btree (status, decision);


--
-- Name: revenue_rules_tenant_id_index; Type: INDEX; Schema: public; Owner: leads
--

CREATE INDEX revenue_rules_tenant_id_index ON public.revenue_rules USING btree (tenant_id);


--
-- Name: sales_visit_media_sales_visit_id_media_type_index; Type: INDEX; Schema: public; Owner: leads
--

CREATE INDEX sales_visit_media_sales_visit_id_media_type_index ON public.sales_visit_media USING btree (sales_visit_id, media_type);


--
-- Name: sales_visits_lead_id_status_index; Type: INDEX; Schema: public; Owner: leads
--

CREATE INDEX sales_visits_lead_id_status_index ON public.sales_visits USING btree (lead_id, status);


--
-- Name: sales_visits_risk_status_created_at_index; Type: INDEX; Schema: public; Owner: leads
--

CREATE INDEX sales_visits_risk_status_created_at_index ON public.sales_visits USING btree (risk_status, created_at);


--
-- Name: sales_visits_user_id_clock_in_at_index; Type: INDEX; Schema: public; Owner: leads
--

CREATE INDEX sales_visits_user_id_clock_in_at_index ON public.sales_visits USING btree (user_id, clock_in_at);


--
-- Name: sessions_last_activity_index; Type: INDEX; Schema: public; Owner: leads
--

CREATE INDEX sessions_last_activity_index ON public.sessions USING btree (last_activity);


--
-- Name: sessions_user_id_index; Type: INDEX; Schema: public; Owner: leads
--

CREATE INDEX sessions_user_id_index ON public.sessions USING btree (user_id);


--
-- Name: territories_tenant_id_index; Type: INDEX; Schema: public; Owner: leads
--

CREATE INDEX territories_tenant_id_index ON public.territories USING btree (tenant_id);


--
-- Name: users_tenant_id_index; Type: INDEX; Schema: public; Owner: leads
--

CREATE INDEX users_tenant_id_index ON public.users USING btree (tenant_id);


--
-- Name: whatsapp_contacts_normalized_phone_number_index; Type: INDEX; Schema: public; Owner: leads
--

CREATE INDEX whatsapp_contacts_normalized_phone_number_index ON public.whatsapp_contacts USING btree (normalized_phone_number);


--
-- Name: whatsapp_conversations_platform_index; Type: INDEX; Schema: public; Owner: leads
--

CREATE INDEX whatsapp_conversations_platform_index ON public.whatsapp_conversations USING btree (platform);


--
-- Name: ai_parameter_suggestions ai_parameter_suggestions_product_id_fkey; Type: FK CONSTRAINT; Schema: legacy_mgmt; Owner: leads
--

ALTER TABLE ONLY legacy_mgmt.ai_parameter_suggestions
    ADD CONSTRAINT ai_parameter_suggestions_product_id_fkey FOREIGN KEY (product_id) REFERENCES legacy_mgmt.products(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ai_provider_settings ai_provider_settings_updated_by_fkey; Type: FK CONSTRAINT; Schema: legacy_mgmt; Owner: leads
--

ALTER TABLE ONLY legacy_mgmt.ai_provider_settings
    ADD CONSTRAINT ai_provider_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES legacy_mgmt.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ai_provider_settings ai_provider_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: legacy_mgmt; Owner: leads
--

ALTER TABLE ONLY legacy_mgmt.ai_provider_settings
    ADD CONSTRAINT ai_provider_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES legacy_mgmt.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: legacy_mgmt; Owner: leads
--

ALTER TABLE ONLY legacy_mgmt.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES legacy_mgmt.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: evaluation_overrides evaluation_overrides_evaluation_id_fkey; Type: FK CONSTRAINT; Schema: legacy_mgmt; Owner: leads
--

ALTER TABLE ONLY legacy_mgmt.evaluation_overrides
    ADD CONSTRAINT evaluation_overrides_evaluation_id_fkey FOREIGN KEY (evaluation_id) REFERENCES legacy_mgmt.lead_evaluations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: evaluation_overrides evaluation_overrides_overridden_by_fkey; Type: FK CONSTRAINT; Schema: legacy_mgmt; Owner: leads
--

ALTER TABLE ONLY legacy_mgmt.evaluation_overrides
    ADD CONSTRAINT evaluation_overrides_overridden_by_fkey FOREIGN KEY (overridden_by) REFERENCES legacy_mgmt.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: lead_activities lead_activities_lead_id_fkey; Type: FK CONSTRAINT; Schema: legacy_mgmt; Owner: leads
--

ALTER TABLE ONLY legacy_mgmt.lead_activities
    ADD CONSTRAINT lead_activities_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES legacy_mgmt.leads(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: lead_activities lead_activities_user_id_fkey; Type: FK CONSTRAINT; Schema: legacy_mgmt; Owner: leads
--

ALTER TABLE ONLY legacy_mgmt.lead_activities
    ADD CONSTRAINT lead_activities_user_id_fkey FOREIGN KEY (user_id) REFERENCES legacy_mgmt.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: lead_evaluations lead_evaluations_evaluated_by_fkey; Type: FK CONSTRAINT; Schema: legacy_mgmt; Owner: leads
--

ALTER TABLE ONLY legacy_mgmt.lead_evaluations
    ADD CONSTRAINT lead_evaluations_evaluated_by_fkey FOREIGN KEY (evaluated_by) REFERENCES legacy_mgmt.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: lead_evaluations lead_evaluations_lead_id_fkey; Type: FK CONSTRAINT; Schema: legacy_mgmt; Owner: leads
--

ALTER TABLE ONLY legacy_mgmt.lead_evaluations
    ADD CONSTRAINT lead_evaluations_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES legacy_mgmt.leads(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: lead_evaluations lead_evaluations_recommended_product_id_fkey; Type: FK CONSTRAINT; Schema: legacy_mgmt; Owner: leads
--

ALTER TABLE ONLY legacy_mgmt.lead_evaluations
    ADD CONSTRAINT lead_evaluations_recommended_product_id_fkey FOREIGN KEY (recommended_product_id) REFERENCES legacy_mgmt.products(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: lead_scores lead_scores_evaluation_id_fkey; Type: FK CONSTRAINT; Schema: legacy_mgmt; Owner: leads
--

ALTER TABLE ONLY legacy_mgmt.lead_scores
    ADD CONSTRAINT lead_scores_evaluation_id_fkey FOREIGN KEY (evaluation_id) REFERENCES legacy_mgmt.lead_evaluations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: lead_scores lead_scores_lead_id_fkey; Type: FK CONSTRAINT; Schema: legacy_mgmt; Owner: leads
--

ALTER TABLE ONLY legacy_mgmt.lead_scores
    ADD CONSTRAINT lead_scores_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES legacy_mgmt.leads(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: lead_scores lead_scores_option_id_fkey; Type: FK CONSTRAINT; Schema: legacy_mgmt; Owner: leads
--

ALTER TABLE ONLY legacy_mgmt.lead_scores
    ADD CONSTRAINT lead_scores_option_id_fkey FOREIGN KEY (option_id) REFERENCES legacy_mgmt.parameter_options(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: lead_scores lead_scores_parameter_id_fkey; Type: FK CONSTRAINT; Schema: legacy_mgmt; Owner: leads
--

ALTER TABLE ONLY legacy_mgmt.lead_scores
    ADD CONSTRAINT lead_scores_parameter_id_fkey FOREIGN KEY (parameter_id) REFERENCES legacy_mgmt.parameters(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: leads leads_created_by_fkey; Type: FK CONSTRAINT; Schema: legacy_mgmt; Owner: leads
--

ALTER TABLE ONLY legacy_mgmt.leads
    ADD CONSTRAINT leads_created_by_fkey FOREIGN KEY (created_by) REFERENCES legacy_mgmt.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: leads leads_source_id_fkey; Type: FK CONSTRAINT; Schema: legacy_mgmt; Owner: leads
--

ALTER TABLE ONLY legacy_mgmt.leads
    ADD CONSTRAINT leads_source_id_fkey FOREIGN KEY (source_id) REFERENCES legacy_mgmt.lead_sources(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: parameter_options parameter_options_parameter_id_fkey; Type: FK CONSTRAINT; Schema: legacy_mgmt; Owner: leads
--

ALTER TABLE ONLY legacy_mgmt.parameter_options
    ADD CONSTRAINT parameter_options_parameter_id_fkey FOREIGN KEY (parameter_id) REFERENCES legacy_mgmt.parameters(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: parameters parameters_dimension_id_fkey; Type: FK CONSTRAINT; Schema: legacy_mgmt; Owner: leads
--

ALTER TABLE ONLY legacy_mgmt.parameters
    ADD CONSTRAINT parameters_dimension_id_fkey FOREIGN KEY (dimension_id) REFERENCES legacy_mgmt.scoring_dimensions(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: parameters parameters_product_id_fkey; Type: FK CONSTRAINT; Schema: legacy_mgmt; Owner: leads
--

ALTER TABLE ONLY legacy_mgmt.parameters
    ADD CONSTRAINT parameters_product_id_fkey FOREIGN KEY (product_id) REFERENCES legacy_mgmt.products(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: product_questions product_questions_product_id_fkey; Type: FK CONSTRAINT; Schema: legacy_mgmt; Owner: leads
--

ALTER TABLE ONLY legacy_mgmt.product_questions
    ADD CONSTRAINT product_questions_product_id_fkey FOREIGN KEY (product_id) REFERENCES legacy_mgmt.products(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: users users_role_id_fkey; Type: FK CONSTRAINT; Schema: legacy_mgmt; Owner: leads
--

ALTER TABLE ONLY legacy_mgmt.users
    ADD CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES legacy_mgmt.roles(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ai_connection_tests ai_connection_tests_ai_provider_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.ai_connection_tests
    ADD CONSTRAINT ai_connection_tests_ai_provider_id_foreign FOREIGN KEY (ai_provider_id) REFERENCES public.ai_providers(id) ON DELETE CASCADE;


--
-- Name: ai_connection_tests ai_connection_tests_tested_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.ai_connection_tests
    ADD CONSTRAINT ai_connection_tests_tested_by_foreign FOREIGN KEY (tested_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: ai_feature_routes ai_feature_routes_ai_model_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.ai_feature_routes
    ADD CONSTRAINT ai_feature_routes_ai_model_id_foreign FOREIGN KEY (ai_model_id) REFERENCES public.ai_models(id) ON DELETE CASCADE;


--
-- Name: ai_model_routes ai_model_routes_fallback_model_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.ai_model_routes
    ADD CONSTRAINT ai_model_routes_fallback_model_id_foreign FOREIGN KEY (fallback_model_id) REFERENCES public.ai_models(id) ON DELETE SET NULL;


--
-- Name: ai_model_routes ai_model_routes_primary_model_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.ai_model_routes
    ADD CONSTRAINT ai_model_routes_primary_model_id_foreign FOREIGN KEY (primary_model_id) REFERENCES public.ai_models(id) ON DELETE CASCADE;


--
-- Name: ai_models ai_models_ai_provider_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.ai_models
    ADD CONSTRAINT ai_models_ai_provider_id_foreign FOREIGN KEY (ai_provider_id) REFERENCES public.ai_providers(id) ON DELETE CASCADE;


--
-- Name: ai_prompt_template_versions ai_prompt_template_versions_activated_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.ai_prompt_template_versions
    ADD CONSTRAINT ai_prompt_template_versions_activated_by_foreign FOREIGN KEY (activated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: ai_prompt_template_versions ai_prompt_template_versions_ai_prompt_template_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.ai_prompt_template_versions
    ADD CONSTRAINT ai_prompt_template_versions_ai_prompt_template_id_foreign FOREIGN KEY (ai_prompt_template_id) REFERENCES public.ai_prompt_templates(id) ON DELETE CASCADE;


--
-- Name: ai_prompt_template_versions ai_prompt_template_versions_created_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.ai_prompt_template_versions
    ADD CONSTRAINT ai_prompt_template_versions_created_by_foreign FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: ai_prompt_templates ai_prompt_templates_active_version_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.ai_prompt_templates
    ADD CONSTRAINT ai_prompt_templates_active_version_id_foreign FOREIGN KEY (active_version_id) REFERENCES public.ai_prompt_template_versions(id) ON DELETE SET NULL;


--
-- Name: ai_prompt_templates ai_prompt_templates_created_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.ai_prompt_templates
    ADD CONSTRAINT ai_prompt_templates_created_by_foreign FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: ai_prompt_templates ai_prompt_templates_updated_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.ai_prompt_templates
    ADD CONSTRAINT ai_prompt_templates_updated_by_foreign FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: ai_requests ai_requests_ai_model_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.ai_requests
    ADD CONSTRAINT ai_requests_ai_model_id_foreign FOREIGN KEY (ai_model_id) REFERENCES public.ai_models(id) ON DELETE SET NULL;


--
-- Name: ai_requests ai_requests_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.ai_requests
    ADD CONSTRAINT ai_requests_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: audit_logs audit_logs_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;


--
-- Name: audit_logs audit_logs_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: contact_enrichment_candidates contact_enrichment_candidates_created_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.contact_enrichment_candidates
    ADD CONSTRAINT contact_enrichment_candidates_created_by_foreign FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: contact_enrichment_candidates contact_enrichment_candidates_lead_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.contact_enrichment_candidates
    ADD CONSTRAINT contact_enrichment_candidates_lead_id_foreign FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: currency_settings currency_settings_currency_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.currency_settings
    ADD CONSTRAINT currency_settings_currency_id_foreign FOREIGN KEY (currency_id) REFERENCES public.currencies(id) ON DELETE RESTRICT;


--
-- Name: currency_settings currency_settings_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.currency_settings
    ADD CONSTRAINT currency_settings_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;


--
-- Name: geo_product_fit_analyses geo_product_fit_analyses_created_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.geo_product_fit_analyses
    ADD CONSTRAINT geo_product_fit_analyses_created_by_foreign FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: geo_product_fit_analyses geo_product_fit_analyses_lead_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.geo_product_fit_analyses
    ADD CONSTRAINT geo_product_fit_analyses_lead_id_foreign FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE SET NULL;


--
-- Name: geo_product_fit_analyses geo_product_fit_analyses_product_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.geo_product_fit_analyses
    ADD CONSTRAINT geo_product_fit_analyses_product_id_foreign FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: icp_profiles icp_profiles_created_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.icp_profiles
    ADD CONSTRAINT icp_profiles_created_by_foreign FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: icp_profiles icp_profiles_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.icp_profiles
    ADD CONSTRAINT icp_profiles_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;


--
-- Name: integration_configs integration_configs_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.integration_configs
    ADD CONSTRAINT integration_configs_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;


--
-- Name: integration_connections integration_connections_created_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.integration_connections
    ADD CONSTRAINT integration_connections_created_by_foreign FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: integration_connections integration_connections_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.integration_connections
    ADD CONSTRAINT integration_connections_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: integration_credential_stores integration_credential_stores_integration_connection_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.integration_credential_stores
    ADD CONSTRAINT integration_credential_stores_integration_connection_id_foreign FOREIGN KEY (integration_connection_id) REFERENCES public.integration_connections(id) ON DELETE CASCADE;


--
-- Name: integration_credential_stores integration_credential_stores_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.integration_credential_stores
    ADD CONSTRAINT integration_credential_stores_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: integration_entity_mappings integration_entity_mappings_integration_connection_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.integration_entity_mappings
    ADD CONSTRAINT integration_entity_mappings_integration_connection_id_foreign FOREIGN KEY (integration_connection_id) REFERENCES public.integration_connections(id) ON DELETE CASCADE;


--
-- Name: integration_entity_mappings integration_entity_mappings_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.integration_entity_mappings
    ADD CONSTRAINT integration_entity_mappings_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: integration_webhook_events integration_webhook_events_integration_connection_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.integration_webhook_events
    ADD CONSTRAINT integration_webhook_events_integration_connection_id_foreign FOREIGN KEY (integration_connection_id) REFERENCES public.integration_connections(id) ON DELETE SET NULL;


--
-- Name: integration_webhook_events integration_webhook_events_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.integration_webhook_events
    ADD CONSTRAINT integration_webhook_events_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;


--
-- Name: lark_base_record_mappings lark_base_record_mappings_lark_base_table_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lark_base_record_mappings
    ADD CONSTRAINT lark_base_record_mappings_lark_base_table_id_foreign FOREIGN KEY (lark_base_table_id) REFERENCES public.lark_base_tables(id) ON DELETE CASCADE;


--
-- Name: lark_base_record_mappings lark_base_record_mappings_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lark_base_record_mappings
    ADD CONSTRAINT lark_base_record_mappings_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: lark_base_tables lark_base_tables_lark_integration_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lark_base_tables
    ADD CONSTRAINT lark_base_tables_lark_integration_id_foreign FOREIGN KEY (lark_integration_id) REFERENCES public.lark_integrations(id) ON DELETE CASCADE;


--
-- Name: lark_base_tables lark_base_tables_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lark_base_tables
    ADD CONSTRAINT lark_base_tables_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: lark_events lark_events_lark_integration_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lark_events
    ADD CONSTRAINT lark_events_lark_integration_id_foreign FOREIGN KEY (lark_integration_id) REFERENCES public.lark_integrations(id) ON DELETE CASCADE;


--
-- Name: lark_events lark_events_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lark_events
    ADD CONSTRAINT lark_events_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: lark_integrations lark_integrations_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lark_integrations
    ADD CONSTRAINT lark_integrations_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: lark_sso_users lark_sso_users_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lark_sso_users
    ADD CONSTRAINT lark_sso_users_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: lark_sso_users lark_sso_users_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lark_sso_users
    ADD CONSTRAINT lark_sso_users_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: lark_syncs lark_syncs_lark_integration_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lark_syncs
    ADD CONSTRAINT lark_syncs_lark_integration_id_foreign FOREIGN KEY (lark_integration_id) REFERENCES public.lark_integrations(id) ON DELETE CASCADE;


--
-- Name: lark_syncs lark_syncs_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lark_syncs
    ADD CONSTRAINT lark_syncs_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: lead_activities lead_activities_lead_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_activities
    ADD CONSTRAINT lead_activities_lead_id_foreign FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: lead_activities lead_activities_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_activities
    ADD CONSTRAINT lead_activities_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;


--
-- Name: lead_activities lead_activities_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_activities
    ADD CONSTRAINT lead_activities_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: lead_ai_analyses lead_ai_analyses_lead_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_ai_analyses
    ADD CONSTRAINT lead_ai_analyses_lead_id_foreign FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: lead_ai_evaluations lead_ai_evaluations_lead_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_ai_evaluations
    ADD CONSTRAINT lead_ai_evaluations_lead_id_foreign FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: lead_ai_evaluations lead_ai_evaluations_recommended_product_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_ai_evaluations
    ADD CONSTRAINT lead_ai_evaluations_recommended_product_id_foreign FOREIGN KEY (recommended_product_id) REFERENCES public.products(id) ON DELETE SET NULL;


--
-- Name: lead_analysis_logs lead_analysis_logs_lead_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_analysis_logs
    ADD CONSTRAINT lead_analysis_logs_lead_id_foreign FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: lead_analysis_logs lead_analysis_logs_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_analysis_logs
    ADD CONSTRAINT lead_analysis_logs_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;


--
-- Name: lead_bantc_question_guides lead_bantc_question_guides_lead_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_bantc_question_guides
    ADD CONSTRAINT lead_bantc_question_guides_lead_id_foreign FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: lead_bantc_question_guides lead_bantc_question_guides_updated_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_bantc_question_guides
    ADD CONSTRAINT lead_bantc_question_guides_updated_by_foreign FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: lead_channel_types lead_channel_types_lead_source_type_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_channel_types
    ADD CONSTRAINT lead_channel_types_lead_source_type_id_foreign FOREIGN KEY (lead_source_type_id) REFERENCES public.lead_source_types(id) ON DELETE CASCADE;


--
-- Name: lead_contact_payloads lead_contact_payloads_contact_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_contact_payloads
    ADD CONSTRAINT lead_contact_payloads_contact_id_foreign FOREIGN KEY (contact_id) REFERENCES public.lead_contacts(id) ON DELETE CASCADE;


--
-- Name: lead_contacts lead_contacts_contact_source_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_contacts
    ADD CONSTRAINT lead_contacts_contact_source_id_foreign FOREIGN KEY (contact_source_id) REFERENCES public.contact_sources(id) ON DELETE SET NULL;


--
-- Name: lead_contacts lead_contacts_lead_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_contacts
    ADD CONSTRAINT lead_contacts_lead_id_foreign FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: lead_conversion_predictions lead_conversion_predictions_lead_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_conversion_predictions
    ADD CONSTRAINT lead_conversion_predictions_lead_id_foreign FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: lead_follow_ups lead_follow_ups_assigned_to_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_follow_ups
    ADD CONSTRAINT lead_follow_ups_assigned_to_foreign FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: lead_follow_ups lead_follow_ups_lead_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_follow_ups
    ADD CONSTRAINT lead_follow_ups_lead_id_foreign FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: lead_funnel_history lead_funnel_history_from_stage_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_funnel_history
    ADD CONSTRAINT lead_funnel_history_from_stage_id_foreign FOREIGN KEY (from_stage_id) REFERENCES public.funnel_stages(id) ON DELETE SET NULL;


--
-- Name: lead_funnel_history lead_funnel_history_lead_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_funnel_history
    ADD CONSTRAINT lead_funnel_history_lead_id_foreign FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: lead_funnel_history lead_funnel_history_moved_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_funnel_history
    ADD CONSTRAINT lead_funnel_history_moved_by_foreign FOREIGN KEY (moved_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: lead_funnel_history lead_funnel_history_to_stage_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_funnel_history
    ADD CONSTRAINT lead_funnel_history_to_stage_id_foreign FOREIGN KEY (to_stage_id) REFERENCES public.funnel_stages(id) ON DELETE SET NULL;


--
-- Name: lead_icp_config lead_icp_config_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_icp_config
    ADD CONSTRAINT lead_icp_config_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;


--
-- Name: lead_icp_matches lead_icp_matches_icp_profile_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_icp_matches
    ADD CONSTRAINT lead_icp_matches_icp_profile_id_foreign FOREIGN KEY (icp_profile_id) REFERENCES public.icp_profiles(id) ON DELETE CASCADE;


--
-- Name: lead_icp_matches lead_icp_matches_lead_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_icp_matches
    ADD CONSTRAINT lead_icp_matches_lead_id_foreign FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: lead_meetings lead_meetings_created_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_meetings
    ADD CONSTRAINT lead_meetings_created_by_foreign FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: lead_meetings lead_meetings_lead_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_meetings
    ADD CONSTRAINT lead_meetings_lead_id_foreign FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: lead_outcomes lead_outcomes_closed_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_outcomes
    ADD CONSTRAINT lead_outcomes_closed_by_foreign FOREIGN KEY (closed_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: lead_outcomes lead_outcomes_lead_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_outcomes
    ADD CONSTRAINT lead_outcomes_lead_id_foreign FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: lead_outcomes lead_outcomes_product_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_outcomes
    ADD CONSTRAINT lead_outcomes_product_id_foreign FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;


--
-- Name: lead_pre_meeting_briefs lead_pre_meeting_briefs_lead_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_pre_meeting_briefs
    ADD CONSTRAINT lead_pre_meeting_briefs_lead_id_foreign FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: lead_pre_meeting_briefs lead_pre_meeting_briefs_product_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_pre_meeting_briefs
    ADD CONSTRAINT lead_pre_meeting_briefs_product_id_foreign FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;


--
-- Name: lead_prescriptions lead_prescriptions_lead_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_prescriptions
    ADD CONSTRAINT lead_prescriptions_lead_id_foreign FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: lead_prescriptions lead_prescriptions_recommended_owner_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_prescriptions
    ADD CONSTRAINT lead_prescriptions_recommended_owner_id_foreign FOREIGN KEY (recommended_owner_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: lead_product_match_runs lead_product_match_runs_lead_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_product_match_runs
    ADD CONSTRAINT lead_product_match_runs_lead_id_foreign FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: lead_product_match_runs lead_product_match_runs_triggered_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_product_match_runs
    ADD CONSTRAINT lead_product_match_runs_triggered_by_foreign FOREIGN KEY (triggered_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: lead_product_matches lead_product_matches_lead_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_product_matches
    ADD CONSTRAINT lead_product_matches_lead_id_foreign FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: lead_product_matches lead_product_matches_product_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_product_matches
    ADD CONSTRAINT lead_product_matches_product_id_foreign FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: lead_qualifications lead_qualifications_lead_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_qualifications
    ADD CONSTRAINT lead_qualifications_lead_id_foreign FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: lead_qualifications lead_qualifications_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_qualifications
    ADD CONSTRAINT lead_qualifications_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;


--
-- Name: lead_revenue_analyses lead_revenue_analyses_lead_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_revenue_analyses
    ADD CONSTRAINT lead_revenue_analyses_lead_id_foreign FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: lead_score_breakdowns lead_score_breakdowns_lead_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_score_breakdowns
    ADD CONSTRAINT lead_score_breakdowns_lead_id_foreign FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: lead_score_breakdowns lead_score_breakdowns_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_score_breakdowns
    ADD CONSTRAINT lead_score_breakdowns_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;


--
-- Name: lead_scores lead_scores_lead_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_scores
    ADD CONSTRAINT lead_scores_lead_id_foreign FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: lead_scores lead_scores_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_scores
    ADD CONSTRAINT lead_scores_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;


--
-- Name: lead_sources lead_sources_channel_type_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_sources
    ADD CONSTRAINT lead_sources_channel_type_id_foreign FOREIGN KEY (channel_type_id) REFERENCES public.lead_channel_types(id) ON DELETE SET NULL;


--
-- Name: lead_sources lead_sources_lead_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_sources
    ADD CONSTRAINT lead_sources_lead_id_foreign FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: lead_sources lead_sources_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_sources
    ADD CONSTRAINT lead_sources_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;


--
-- Name: lead_transcripts lead_transcripts_activity_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_transcripts
    ADD CONSTRAINT lead_transcripts_activity_id_foreign FOREIGN KEY (activity_id) REFERENCES public.lead_activities(id) ON DELETE SET NULL;


--
-- Name: lead_transcripts lead_transcripts_lead_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.lead_transcripts
    ADD CONSTRAINT lead_transcripts_lead_id_foreign FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: leads leads_am_owner_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_am_owner_id_foreign FOREIGN KEY (am_owner_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: leads leads_created_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_created_by_foreign FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: leads leads_csm_owner_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_csm_owner_id_foreign FOREIGN KEY (csm_owner_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: leads leads_duplicate_of_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_duplicate_of_id_foreign FOREIGN KEY (duplicate_of_id) REFERENCES public.leads(id) ON DELETE SET NULL;


--
-- Name: leads leads_funnel_stage_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_funnel_stage_id_foreign FOREIGN KEY (funnel_stage_id) REFERENCES public.funnel_stages(id) ON DELETE SET NULL;


--
-- Name: leads leads_industry_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_industry_id_foreign FOREIGN KEY (industry_id) REFERENCES public.industries(id) ON DELETE SET NULL;


--
-- Name: leads leads_owner_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_owner_id_foreign FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: leads leads_parent_lead_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_parent_lead_id_foreign FOREIGN KEY (parent_lead_id) REFERENCES public.leads(id) ON DELETE SET NULL;


--
-- Name: leads leads_presales_owner_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_presales_owner_id_foreign FOREIGN KEY (presales_owner_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: leads leads_product_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_product_id_foreign FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;


--
-- Name: leads leads_sub_industry_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_sub_industry_id_foreign FOREIGN KEY (sub_industry_id) REFERENCES public.sub_industries(id) ON DELETE SET NULL;


--
-- Name: leads leads_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;


--
-- Name: leads leads_territory_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_territory_id_foreign FOREIGN KEY (territory_id) REFERENCES public.territories(id) ON DELETE SET NULL;


--
-- Name: map_search_history map_search_history_created_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.map_search_history
    ADD CONSTRAINT map_search_history_created_by_foreign FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: product_questions product_questions_product_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.product_questions
    ADD CONSTRAINT product_questions_product_id_foreign FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_questions product_questions_updated_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.product_questions
    ADD CONSTRAINT product_questions_updated_by_foreign FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: product_tiers product_tiers_product_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.product_tiers
    ADD CONSTRAINT product_tiers_product_id_foreign FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: products products_created_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_created_by_foreign FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: products products_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;


--
-- Name: qualification_parameter_options qualification_parameter_options_parameter_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.qualification_parameter_options
    ADD CONSTRAINT qualification_parameter_options_parameter_id_foreign FOREIGN KEY (parameter_id) REFERENCES public.qualification_parameters(id) ON DELETE CASCADE;


--
-- Name: qualification_parameter_sets qualification_parameter_sets_created_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.qualification_parameter_sets
    ADD CONSTRAINT qualification_parameter_sets_created_by_foreign FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: qualification_parameter_sets qualification_parameter_sets_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.qualification_parameter_sets
    ADD CONSTRAINT qualification_parameter_sets_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;


--
-- Name: qualification_parameter_sets qualification_parameter_sets_updated_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.qualification_parameter_sets
    ADD CONSTRAINT qualification_parameter_sets_updated_by_foreign FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: qualification_parameters qualification_parameters_parameter_set_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.qualification_parameters
    ADD CONSTRAINT qualification_parameters_parameter_set_id_foreign FOREIGN KEY (parameter_set_id) REFERENCES public.qualification_parameter_sets(id) ON DELETE CASCADE;


--
-- Name: qualification_workflow_reviews qualification_workflow_reviews_lead_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.qualification_workflow_reviews
    ADD CONSTRAINT qualification_workflow_reviews_lead_id_foreign FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE SET NULL;


--
-- Name: qualification_workflow_reviews qualification_workflow_reviews_lead_qualification_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.qualification_workflow_reviews
    ADD CONSTRAINT qualification_workflow_reviews_lead_qualification_id_foreign FOREIGN KEY (lead_qualification_id) REFERENCES public.lead_qualifications(id) ON DELETE SET NULL;


--
-- Name: qualification_workflow_reviews qualification_workflow_reviews_requested_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.qualification_workflow_reviews
    ADD CONSTRAINT qualification_workflow_reviews_requested_by_foreign FOREIGN KEY (requested_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: qualification_workflow_reviews qualification_workflow_reviews_reviewed_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.qualification_workflow_reviews
    ADD CONSTRAINT qualification_workflow_reviews_reviewed_by_foreign FOREIGN KEY (reviewed_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: qualification_workflow_reviews qualification_workflow_reviews_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.qualification_workflow_reviews
    ADD CONSTRAINT qualification_workflow_reviews_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;


--
-- Name: qualification_workflow_reviews qualification_workflow_reviews_workflow_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.qualification_workflow_reviews
    ADD CONSTRAINT qualification_workflow_reviews_workflow_id_foreign FOREIGN KEY (workflow_id) REFERENCES public.qualification_workflows(id) ON DELETE CASCADE;


--
-- Name: qualification_workflow_stages qualification_workflow_stages_workflow_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.qualification_workflow_stages
    ADD CONSTRAINT qualification_workflow_stages_workflow_id_foreign FOREIGN KEY (workflow_id) REFERENCES public.qualification_workflows(id) ON DELETE CASCADE;


--
-- Name: qualification_workflows qualification_workflows_created_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.qualification_workflows
    ADD CONSTRAINT qualification_workflows_created_by_foreign FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: qualification_workflows qualification_workflows_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.qualification_workflows
    ADD CONSTRAINT qualification_workflows_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;


--
-- Name: qualification_workflows qualification_workflows_updated_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.qualification_workflows
    ADD CONSTRAINT qualification_workflows_updated_by_foreign FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: record_origin_mappings record_origin_mappings_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.record_origin_mappings
    ADD CONSTRAINT record_origin_mappings_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;


--
-- Name: revenue_rules revenue_rules_created_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.revenue_rules
    ADD CONSTRAINT revenue_rules_created_by_foreign FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: revenue_rules revenue_rules_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.revenue_rules
    ADD CONSTRAINT revenue_rules_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;


--
-- Name: role_permission role_permission_permission_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.role_permission
    ADD CONSTRAINT role_permission_permission_id_foreign FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE;


--
-- Name: role_permission role_permission_role_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.role_permission
    ADD CONSTRAINT role_permission_role_id_foreign FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: sales_visit_media sales_visit_media_sales_visit_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.sales_visit_media
    ADD CONSTRAINT sales_visit_media_sales_visit_id_foreign FOREIGN KEY (sales_visit_id) REFERENCES public.sales_visits(id) ON DELETE CASCADE;


--
-- Name: sales_visit_media sales_visit_media_uploaded_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.sales_visit_media
    ADD CONSTRAINT sales_visit_media_uploaded_by_foreign FOREIGN KEY (uploaded_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: sales_visits sales_visits_lead_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.sales_visits
    ADD CONSTRAINT sales_visits_lead_id_foreign FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: sales_visits sales_visits_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.sales_visits
    ADD CONSTRAINT sales_visits_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: sub_industries sub_industries_industry_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.sub_industries
    ADD CONSTRAINT sub_industries_industry_id_foreign FOREIGN KEY (industry_id) REFERENCES public.industries(id) ON DELETE CASCADE;


--
-- Name: territories territories_created_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.territories
    ADD CONSTRAINT territories_created_by_foreign FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: territories territories_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.territories
    ADD CONSTRAINT territories_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;


--
-- Name: users users_direct_manager_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_direct_manager_id_foreign FOREIGN KEY (direct_manager_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: users users_role_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_role_id_foreign FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE SET NULL;


--
-- Name: users users_tenant_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_tenant_id_foreign FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;


--
-- Name: whatsapp_ai_analyses whatsapp_ai_analyses_conversation_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.whatsapp_ai_analyses
    ADD CONSTRAINT whatsapp_ai_analyses_conversation_id_foreign FOREIGN KEY (conversation_id) REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE;


--
-- Name: whatsapp_campaign_recipients whatsapp_campaign_recipients_campaign_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.whatsapp_campaign_recipients
    ADD CONSTRAINT whatsapp_campaign_recipients_campaign_id_foreign FOREIGN KEY (campaign_id) REFERENCES public.whatsapp_campaigns(id) ON DELETE CASCADE;


--
-- Name: whatsapp_campaign_recipients whatsapp_campaign_recipients_lead_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.whatsapp_campaign_recipients
    ADD CONSTRAINT whatsapp_campaign_recipients_lead_id_foreign FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE SET NULL;


--
-- Name: whatsapp_contacts whatsapp_contacts_linked_lead_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.whatsapp_contacts
    ADD CONSTRAINT whatsapp_contacts_linked_lead_id_foreign FOREIGN KEY (linked_lead_id) REFERENCES public.leads(id) ON DELETE SET NULL;


--
-- Name: whatsapp_contacts whatsapp_contacts_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.whatsapp_contacts
    ADD CONSTRAINT whatsapp_contacts_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: whatsapp_conversations whatsapp_conversations_contact_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.whatsapp_conversations
    ADD CONSTRAINT whatsapp_conversations_contact_id_foreign FOREIGN KEY (contact_id) REFERENCES public.whatsapp_contacts(id) ON DELETE CASCADE;


--
-- Name: whatsapp_conversations whatsapp_conversations_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.whatsapp_conversations
    ADD CONSTRAINT whatsapp_conversations_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: whatsapp_messages whatsapp_messages_conversation_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: leads
--

ALTER TABLE ONLY public.whatsapp_messages
    ADD CONSTRAINT whatsapp_messages_conversation_id_foreign FOREIGN KEY (conversation_id) REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict kUnspsUJptIOA4OxpPo0jX2W4Dd8ZIqlEabcgAtUuPZc6f5q9rfEroIz0snk8Zp

