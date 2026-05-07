--
-- PostgreSQL database dump
--

\restrict ePO8GBeOdlUhHWSBnDhenXZVlKBofIX5Gu4TKQtMfS8GB6LyIEjoYuODmiioqa9

-- Dumped from database version 18.1
-- Dumped by pg_dump version 18.1

-- Started on 2026-05-05 12:17:13

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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 230 (class 1259 OID 295042)
-- Name: casamatch_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.casamatch_history (
    id integer NOT NULL,
    user_id integer NOT NULL,
    message text,
    ai_reply text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.casamatch_history OWNER TO postgres;

--
-- TOC entry 229 (class 1259 OID 295041)
-- Name: casamatch_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.casamatch_history ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.casamatch_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 222 (class 1259 OID 294969)
-- Name: listings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.listings (
    id integer NOT NULL,
    title character varying(50) NOT NULL,
    price numeric(6,2) NOT NULL,
    type character varying(50) NOT NULL,
    status character varying NOT NULL,
    city character varying(50) NOT NULL,
    region character varying(50) NOT NULL,
    description text NOT NULL,
    approved_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    facilities jsonb
);


ALTER TABLE public.listings OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 294968)
-- Name: listings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.listings ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.listings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 224 (class 1259 OID 294986)
-- Name: listings_images; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.listings_images (
    id integer NOT NULL,
    listing_id integer,
    image_url text NOT NULL,
    cloudinary_public_id character varying(255),
    is_primary boolean DEFAULT false,
    sort_order integer DEFAULT 0,
    uploaded timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.listings_images OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 294985)
-- Name: listings_images_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.listings_images ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.listings_images_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 226 (class 1259 OID 295004)
-- Name: listings_videos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.listings_videos (
    id integer NOT NULL,
    listing_id integer,
    video_url text NOT NULL,
    thumbnail_url text,
    duration_second integer,
    file_size bigint,
    uploaded timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.listings_videos OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 295003)
-- Name: listings_videos_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.listings_videos ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.listings_videos_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 228 (class 1259 OID 295020)
-- Name: saved_listings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.saved_listings (
    id integer NOT NULL,
    user_id integer NOT NULL,
    listing_id integer NOT NULL,
    saved_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.saved_listings OWNER TO postgres;

--
-- TOC entry 227 (class 1259 OID 295019)
-- Name: saved_listings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.saved_listings ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.saved_listings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 220 (class 1259 OID 294953)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    email character varying(50) NOT NULL,
    password character varying(50) NOT NULL,
    phone integer NOT NULL,
    role character varying(50) NOT NULL,
    avatar character varying(50) NOT NULL,
    is_verified boolean DEFAULT false,
    is_suspended boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 294952)
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.users ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 4967 (class 0 OID 295042)
-- Dependencies: 230
-- Data for Name: casamatch_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.casamatch_history (id, user_id, message, ai_reply, created_at) FROM stdin;
\.


--
-- TOC entry 4959 (class 0 OID 294969)
-- Dependencies: 222
-- Data for Name: listings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.listings (id, title, price, type, status, city, region, description, approved_at, created_at, facilities) FROM stdin;
\.


--
-- TOC entry 4961 (class 0 OID 294986)
-- Dependencies: 224
-- Data for Name: listings_images; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.listings_images (id, listing_id, image_url, cloudinary_public_id, is_primary, sort_order, uploaded) FROM stdin;
\.


--
-- TOC entry 4963 (class 0 OID 295004)
-- Dependencies: 226
-- Data for Name: listings_videos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.listings_videos (id, listing_id, video_url, thumbnail_url, duration_second, file_size, uploaded) FROM stdin;
\.


--
-- TOC entry 4965 (class 0 OID 295020)
-- Dependencies: 228
-- Data for Name: saved_listings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.saved_listings (id, user_id, listing_id, saved_at) FROM stdin;
\.


--
-- TOC entry 4957 (class 0 OID 294953)
-- Dependencies: 220
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, name, email, password, phone, role, avatar, is_verified, is_suspended, created_at) FROM stdin;
\.


--
-- TOC entry 4973 (class 0 OID 0)
-- Dependencies: 229
-- Name: casamatch_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.casamatch_history_id_seq', 1, false);


--
-- TOC entry 4974 (class 0 OID 0)
-- Dependencies: 221
-- Name: listings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.listings_id_seq', 1, false);


--
-- TOC entry 4975 (class 0 OID 0)
-- Dependencies: 223
-- Name: listings_images_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.listings_images_id_seq', 1, false);


--
-- TOC entry 4976 (class 0 OID 0)
-- Dependencies: 225
-- Name: listings_videos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.listings_videos_id_seq', 1, false);


--
-- TOC entry 4977 (class 0 OID 0)
-- Dependencies: 227
-- Name: saved_listings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.saved_listings_id_seq', 1, false);


--
-- TOC entry 4978 (class 0 OID 0)
-- Dependencies: 219
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 1, false);


--
-- TOC entry 4803 (class 2606 OID 295051)
-- Name: casamatch_history casamatch_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.casamatch_history
    ADD CONSTRAINT casamatch_history_pkey PRIMARY KEY (id);


--
-- TOC entry 4795 (class 2606 OID 294997)
-- Name: listings_images listings_images_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.listings_images
    ADD CONSTRAINT listings_images_pkey PRIMARY KEY (id);


--
-- TOC entry 4793 (class 2606 OID 294984)
-- Name: listings listings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.listings
    ADD CONSTRAINT listings_pkey PRIMARY KEY (id);


--
-- TOC entry 4797 (class 2606 OID 295013)
-- Name: listings_videos listings_videos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.listings_videos
    ADD CONSTRAINT listings_videos_pkey PRIMARY KEY (id);


--
-- TOC entry 4799 (class 2606 OID 295028)
-- Name: saved_listings saved_listings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.saved_listings
    ADD CONSTRAINT saved_listings_pkey PRIMARY KEY (id);


--
-- TOC entry 4801 (class 2606 OID 295030)
-- Name: saved_listings unique_user_saved_listing; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.saved_listings
    ADD CONSTRAINT unique_user_saved_listing UNIQUE (user_id, listing_id);


--
-- TOC entry 4791 (class 2606 OID 294967)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 4808 (class 2606 OID 295052)
-- Name: casamatch_history casamatch_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.casamatch_history
    ADD CONSTRAINT casamatch_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4804 (class 2606 OID 294998)
-- Name: listings_images listings_images_listing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.listings_images
    ADD CONSTRAINT listings_images_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE CASCADE;


--
-- TOC entry 4805 (class 2606 OID 295014)
-- Name: listings_videos listings_videos_listing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.listings_videos
    ADD CONSTRAINT listings_videos_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE CASCADE;


--
-- TOC entry 4806 (class 2606 OID 295036)
-- Name: saved_listings saved_listings_listing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.saved_listings
    ADD CONSTRAINT saved_listings_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE CASCADE;


--
-- TOC entry 4807 (class 2606 OID 295031)
-- Name: saved_listings saved_listings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.saved_listings
    ADD CONSTRAINT saved_listings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


-- Completed on 2026-05-05 12:17:16

--
-- PostgreSQL database dump complete
--

\unrestrict ePO8GBeOdlUhHWSBnDhenXZVlKBofIX5Gu4TKQtMfS8GB6LyIEjoYuODmiioqa9

