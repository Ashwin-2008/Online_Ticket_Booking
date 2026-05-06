import re
from datetime import datetime, timedelta
from dateutil import parser as date_parser
from typing import Optional, Dict, Any

INTENT_PATTERNS = {
    "select_result": [
        r"\b(book|select|choose|pick)\b.*\b(first|second|third|1st|2nd|3rd|cheapest|earliest|fastest)\b",
        r"\b(select|choose|pick|option)\s*(\d+)\b",
        r"^(first|second|third|1st|2nd|3rd|\d+|one|two|three)$",
        r"\b(cheapest|earliest|fastest)\b.*\b(one|option|ticket|service)\b",
    ],
    "confirm_booking": [
        r"^(yes|confirm|okay|ok|proceed|book it|pay now)$",
    ],
    "book_ticket": [
        r"\b(book|reserve|buy|get|purchase)\b.*\b(ticket|seat|pass)\b",
        r"\b(ticket|seat)\b.*\b(book|reserve|buy)\b",
        r"\b(i want|i need|i'd like)\b.*\b(ticket|seat|travel|go)\b",
    ],
    "search_service": [
        r"\b(search|find|show|list|available|check)\b.*\b(bus|train|flight|movie|event)\b",
        r"\b(bus|train|flight|movie|event)\b.*\b(from|to|at|in)\b",
        r"\b(what|which|any)\b.*\b(bus|train|flight|movie|event)\b",
    ],
    "cancel_booking": [
        r"\b(cancel|refund|return)\b.*\b(ticket|booking|reservation)\b",
    ],
    "booking_status": [
        r"\b(status|track|where|check|show|view|list)\b.*\b(booking|bookings|ticket|tickets|order|orders|trips)\b",
        r"\b(my booking|my bookings|my ticket|my tickets|upcoming trips)\b",
    ],
    "greeting": [
        r"^(hi|hello|hey|good morning|good evening|howdy|namaste)\b",
    ],
    "help": [
        r"\b(help|assist|support|what can you do|how to)\b",
    ],
}

SERVICE_KEYWORDS = {
    "bus": ["bus", "buses", "coach", "volvo", "sleeper bus", "ac bus"],
    "train": ["train", "trains", "railway", "rail", "express", "superfast"],
    "movie": ["movie", "movies", "film", "cinema", "theatre", "theater", "imax"],
    "event": ["event", "events", "concert", "festival", "match", "game", "exhibition", "comedy", "stand-up", "conference", "cricket", "passes", "vip"],
    "flight": ["flight", "flights", "plane", "air", "airline", "airways", "fly"],
}

MOVIE_INTENT_PATTERNS = {
    "show_movies": [
        r"\b(show|list|display|find)\b.*\bmovies?\b",
        r"\bmovies?\b.*\b(today|tomorrow|this weekend|next week|in|at)\b",
    ],
    "book_movie": [
        r"\b(book|reserve|buy|purchase)\b.*\b(movie|movies|film|cinema)\b",
        r"\bbook\b.*\b([a-z0-9][a-z0-9 &'\-:()]{1,80})\s+movie\b",
    ],
    "ask_available_dates": [
        r"\b(which|what|available)\s+dates?\b.*\b(movie|movies|for)\b",
        r"\bwhen\b.*\b(movie|movies|show)\b",
    ],
    "ask_available_cities": [
        r"\b(which|what|available)\s+cities?\b.*\b(movie|movies|for)\b",
        r"\bwhere\b.*\b(movie|movies|show)\b",
    ],
}

CITIES = [
    "mumbai", "delhi", "chennai", "bangalore", "bengaluru", "hyderabad",
    "kolkata", "pune", "ahmedabad", "jaipur", "surat", "lucknow",
    "kanpur", "nagpur", "indore", "bhopal", "visakhapatnam", "patna",
    "salem", "coimbatore", "madurai", "trichy", "tirunelveli", "vellore",
    "kochi", "thiruvananthapuram", "kozhikode", "mysore", "mangalore",
    "goa", "chandigarh", "amritsar", "ludhiana", "agra", "varanasi",
    "dubai", "singapore", "london", "ooty",
]

DATE_PATTERNS = {
    "day after tomorrow": 2, "day after": 2,
    "today": 0, "tonight": 0, "this evening": 0,
    "tomorrow": 1, "tmrw": 1, "tmr": 1,
    "next week": 7,
}

TIME_WINDOWS = {
    "morning": (5, 12),
    "afternoon": (12, 17),
    "evening": (17, 21),
    "night": (20, 24),
    "tonight": (18, 24),
}


def detect_intent(text: str) -> tuple[str, float]:
    text_lower = text.lower().strip()

    for intent, patterns in MOVIE_INTENT_PATTERNS.items():
        for pattern in patterns:
            if re.search(pattern, text_lower):
                return intent, 0.88

    for intent, patterns in INTENT_PATTERNS.items():
        for pattern in patterns:
            if re.search(pattern, text_lower):
                return intent, 0.85

    for stype in SERVICE_KEYWORDS:
        for keyword in SERVICE_KEYWORDS[stype]:
            if keyword in text_lower:
                return "search_service", 0.70
    return "general", 0.50


def extract_service_type(text: str) -> Optional[str]:
    text_lower = text.lower()
    for stype, keywords in SERVICE_KEYWORDS.items():
        for keyword in keywords:
            if re.search(rf"\b{re.escape(keyword)}\b", text_lower):
                return stype
    return None


def extract_movie_name(text: str) -> Optional[str]:
    stop_words = {
        "show", "shows", "book", "reserve", "buy", "purchase", "watch", "available", "movie", "movies",
        "film", "ticket", "tickets", "for", "of", "about", "today", "tomorrow", "tonight", "which",
        "what", "when", "where", "dates", "date", "cities", "city", "theaters", "theatre", "cinema",
        "please", "find", "horror", "imax", "are", "there", "any", "i",
    }
    patterns = [
        r"\b(?:for|of|about|watch|book|reserve|buy|show|available(?:\s+dates?)?)\s+([A-Za-z0-9][A-Za-z0-9 &'\-:()]{1,80}?)\s+(?:movie|film|show|tickets?)\b",
        r"\btickets?\s+for\s+([A-Za-z0-9][A-Za-z0-9 &'\-:()]{1,80}?)\s+(?:at|in|near)\b",
        r"\b(?:book|reserve|buy)\s+(?:\d+\s+)?tickets?\s+for\s+([A-Za-z0-9][A-Za-z0-9 &'\-:()]{1,80}?)\s+(?:at|in|near)\b",
        r"\b([A-Z][A-Za-z0-9&'\-]{1,40}(?:\s+[A-Z][A-Za-z0-9&'\-]{1,40}){0,4})\s+(?:movie|film)\b",
        r"\bmovie\s+([A-Z][A-Za-z0-9&'\-]{1,40}(?:\s+[A-Z][A-Za-z0-9&'\-]{1,40}){0,4})\b",
    ]

    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return cleanup_movie_name(match.group(1))

    fallback = re.search(r"\b([A-Z][A-Za-z0-9&'\-]{1,40}(?:\s+[A-Z0-9][A-Za-z0-9&'\-]{1,40}){0,4})\b", text)
    if fallback:
        cleaned = cleanup_movie_name(fallback.group(1))
        if cleaned and cleaned.lower() not in stop_words:
            return cleaned
    return None


def cleanup_movie_name(value: str) -> Optional[str]:
    cleaned = re.sub(r"\b(are\s+there\s+any|is\s+there\s+any|any)\b", "", value, flags=re.IGNORECASE)
    cleaned = re.sub(r"^\s*(?:\d+\s+|\d+th\s+|\d+st\s+|\d+nd\s+|\d+rd\s+)?", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\b(movie|film|show|ticket|tickets|book|reserve|buy|watch|available|dates?|for|of|about|find|horror|imax)\b", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s{2,}", " ", cleaned).strip()
    return cleaned or None


def extract_cities(text: str) -> tuple[Optional[str], Optional[str]]:
    text_lower = text.lower()
    # Exact substring matches first
    found = [city for city in CITIES if city in text_lower]

    source, destination = None, None
    if len(found) >= 2:
        # default ordering from appearance
        source, destination = found[0], found[1]
        # override when explicit 'from'/'to' present
        from_match = re.search(r'\bfrom\s+(\w+)', text_lower)
        to_match = re.search(r'\bto\s+(\w+)', text_lower)
        if from_match and from_match.group(1) in CITIES:
            source = from_match.group(1)
        if to_match and to_match.group(1) in CITIES:
            destination = to_match.group(1)
    elif len(found) == 1:
        # prefer explicit 'from'/'to' if present
        to_match = re.search(r'\bto\s+(\w+)', text_lower)
        from_match = re.search(r'\bfrom\s+(\w+)', text_lower)
        if to_match and to_match.group(1) in CITIES:
            destination = to_match.group(1)
            # try to find a likely source token before 'to'
            before = text_lower.split('to')[0]
            src_candidates = [c for c in CITIES if c in before]
            if src_candidates:
                source = src_candidates[-1]
        elif from_match and from_match.group(1) in CITIES:
            source = from_match.group(1)
        else:
            # single found term -> ambiguous; treat as destination by default
            destination = found[0]
    else:
        # No exact match: try fuzzy matching using difflib
        try:
            import difflib
            tokens = re.findall(r"[A-Za-z]+", text_lower)
            for tok in tokens:
                close = difflib.get_close_matches(tok, CITIES, n=1, cutoff=0.7)
                if close:
                    # if token appears near 'to' or 'from' decide role
                    if re.search(rf'{tok}\s+to|from\s+{tok}', text_lower):
                        if 'to ' in text_lower and re.search(rf'{tok}\s+to', text_lower):
                            source = close[0]
                        else:
                            destination = close[0]
                    else:
                        destination = close[0]
                    break
        except Exception:
            pass

    return (
        source.capitalize() if source else None,
        destination.capitalize() if destination else None,
    )


def extract_city(text: str) -> Optional[str]:
    text_lower = text.lower()
    for city in CITIES:
        if city in text_lower:
            return city.capitalize()
    return None


def extract_date(text: str) -> Optional[str]:
    text_lower = text.lower()
    today = datetime.now()
    weekdays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]

    if re.search(r"\bafter\s+(8|9|10|11)\s*(?:pm|p\.m\.)\b", text_lower):
        return today.strftime("%Y-%m-%d")

    for phrase, offset in DATE_PATTERNS.items():
        if phrase in text_lower:
            target = today + timedelta(days=offset)
            return target.strftime("%Y-%m-%d")

    if re.search(r"\bthis weekend\b|\bweekend\b", text_lower):
        days_ahead = (5 - today.weekday() + 7) % 7
        if days_ahead == 0:
            days_ahead = 7
        target = today + timedelta(days=days_ahead)
        return target.strftime("%Y-%m-%d")

    for index, weekday in enumerate(weekdays):
        if re.search(rf"\b(?:this|next)?\s*{weekday}\b", text_lower):
            target_weekday = index
            days_ahead = (target_weekday - today.weekday() + 7) % 7
            if days_ahead == 0:
                days_ahead += 7
            target = today + timedelta(days=days_ahead)
            return target.strftime("%Y-%m-%d")

    date_patterns = [
        r'\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b',
        r'\b(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*)\b',
        r'\b((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{1,2})\b',
    ]
    for pattern in date_patterns:
        match = re.search(pattern, text_lower)
        if match:
            try:
                parsed = date_parser.parse(match.group(1), default=today)
                return parsed.strftime("%Y-%m-%d")
            except Exception:
                pass
    return None


def extract_filters(text: str) -> Dict[str, Any]:
    text_lower = text.lower()
    filters: Dict[str, Any] = {}
    amenities = []

    wants_non_ac = bool(re.search(r"\bnon[-\s]?ac\b|non air", text_lower))
    if re.search(r"\bac\b|air\s*condition", text_lower) and not wants_non_ac:
        amenities.append("AC")
    if "sleeper" in text_lower:
        amenities.append("Sleeper")
    if re.search(r"\bwifi\b|wi-fi", text_lower):
        amenities.append("WiFi")
    if re.search(r"charging|charger", text_lower):
        amenities.append("Charging Point")
    if "recliner" in text_lower:
        amenities.append("Recliner Seats")
    if "vip" in text_lower:
        amenities.append("VIP")
    if "comedy" in text_lower or "stand-up" in text_lower:
        amenities.append("Comedy")
    if "music" in text_lower or "concert" in text_lower:
        amenities.append("Music")
    if "tech" in text_lower or "conference" in text_lower:
        amenities.append("Tech")
    if "cricket" in text_lower:
        amenities.append("Cricket")
    if "student" in text_lower or "college" in text_lower:
        amenities.append("Students")
    if "business class" in text_lower:
        amenities.append("Business Class")
    if "baggage" in text_lower or "luggage" in text_lower:
        amenities.append("Baggage Included")
    if re.search(r"non[-\s]?stop", text_lower):
        amenities.append("Non Stop")
    if "horror" in text_lower:
        amenities.append("Horror")
    if "action" in text_lower:
        amenities.append("Action")
    if "imax" in text_lower:
        amenities.append("IMAX")
    if "window" in text_lower:
        amenities.append("Window Seat")
    if wants_non_ac:
        amenities.append("Non AC")

    if amenities:
        filters["amenities"] = amenities

    max_price_match = re.search(r"(?:under|below|less than|within|max(?:imum)?|upto|up to)\s*(?:rs\.?|₹|inr)?\s*(\d+)", text_lower)
    if max_price_match:
        filters["max_price"] = int(max_price_match.group(1))

    min_price_match = re.search(r"(?:above|more than|min(?:imum)?)\s*(?:rs\.?|₹|inr)?\s*(\d+)", text_lower)
    if min_price_match:
        filters["min_price"] = int(min_price_match.group(1))

    for label, hours in TIME_WINDOWS.items():
        if label in text_lower:
            filters["time_window"] = {"label": label, "start": hours[0], "end": hours[1]}
            break
    after_pm = re.search(r"\bafter\s+(8|9|10|11)\s*(?:pm|p\.m\.)\b", text_lower)
    if after_pm:
        filters["time_window"] = {"label": "night", "start": int(after_pm.group(1)) + 12, "end": 24}

    if "cheap" in text_lower or "cheapest" in text_lower or "lowest price" in text_lower:
        filters["sort"] = "cheapest"
    elif "earliest" in text_lower or "first available" in text_lower:
        filters["sort"] = "earliest"
    elif "latest" in text_lower:
        filters["sort"] = "latest"

    return filters


def extract_selection(text: str) -> Optional[Any]:
    text_lower = text.lower().strip()
    option_map = {
        "first": 1, "1st": 1, "one": 1,
        "second": 2, "2nd": 2, "two": 2,
        "third": 3, "3rd": 3, "three": 3,
        "fourth": 4, "4th": 4, "four": 4,
        "fifth": 5, "5th": 5, "five": 5,
    }

    for word, number in option_map.items():
        if re.search(rf"\b{word}\b", text_lower):
            return number

    number_match = re.search(r"\b(?:option\s*)?(\d+)\b", text_lower)
    if number_match:
        return int(number_match.group(1))

    if "cheapest" in text_lower:
        return "cheapest"
    if "earliest" in text_lower or "fastest" in text_lower:
        return "earliest"
    return None


def missing_slots(intent: str, entities: Dict[str, Any]) -> list[str]:
    if intent not in ("book_ticket", "search_service", "book_movie", "show_movies", "ask_available_dates", "ask_available_cities"):
        return []

    stype = entities.get("service_type")
    if not stype:
        return ["service_type"]

    missing = []
    if stype == "movie":
        if intent in ("book_movie", "ask_available_dates", "ask_available_cities") and not entities.get("movie_name"):
            missing.append("movie_name")
        return missing

    if stype in ("bus", "train", "flight"):
        has_search_hint = bool(entities.get("date") or entities.get("filters"))
        if not has_search_hint and not entities.get("source"):
            missing.append("source")
        if not has_search_hint and not entities.get("destination"):
            missing.append("destination")
        if not has_search_hint and not entities.get("date"):
            missing.append("date")
    if not entities.get("seats"):
        missing.append("seats")
    return missing


def extract_seats(text: str) -> int:
    patterns = [
        r'(\d+)\s+(?:\w+\s+){0,3}(?:ticket|seat|pass|passes|person|people|passenger)s?',
        r'(?:for|book)\s*(\d+)',
        r'\b(one|two|three|four|five|six|seven|eight|nine|ten)\b',
    ]
    word_map = {
        "one": 1,
        "two": 2,
        "three": 3,
        "four": 4,
        "five": 5,
        "six": 6,
        "seven": 7,
        "eight": 8,
        "nine": 9,
        "ten": 10,
    }

    for pattern in patterns:
        match = re.search(pattern, text.lower())
        if match:
            value = match.group(1)
            return word_map[value] if value.isalpha() else int(value)
    return 1


def generate_response(intent: str, entities: Dict[str, Any]) -> str:
    stype = entities.get("service_type")
    source = entities.get("source")
    destination = entities.get("destination")
    movie_name = entities.get("movie_name")
    city = entities.get("city")
    date = entities.get("date")
    seats = entities.get("seats", 1)
    missing = entities.get("missing", [])

    if intent == "greeting":
        return "Hello! I am SmartBot, your AI booking assistant. I can help you book bus, train, movie, event, or flight tickets. What would you like to book today?"

    if intent == "help":
        return (
            "I can help you:\n"
            "- Book bus tickets\n"
            "- Book train tickets\n"
            "- Book flights\n"
            "- Book movie tickets\n"
            "- Book event tickets\n\n"
            "Try something like: 'Book 2 bus tickets from Salem to Chennai tomorrow'."
        )

    if intent == "cancel_booking":
        return "To cancel a booking, go to My Bookings in your dashboard and click cancel on the booking you want to remove."

    if intent == "booking_status":
        return "I can show your recent bookings if you are logged in."

    if intent == "select_result":
        return "I can help with that option. Let me check the last results."

    if intent == "confirm_booking":
        return "I will continue with the selected option."

    if intent == "show_movies":
        if movie_name:
            return f"Searching for shows for {movie_name}."
        return "Showing available movies."

    if intent == "book_movie":
        if movie_name and date:
            return f"Searching for {movie_name} on {date}."
        if movie_name:
            return f"I found your movie request for {movie_name}. Which date should I check?"
        return "Which movie would you like to book?"

    if intent == "ask_available_dates":
        if movie_name:
            return f"Checking available dates for {movie_name}."
        return "Which movie are you asking about?"

    if intent == "ask_available_cities":
        if movie_name:
            return f"Checking available cities and theaters for {movie_name}."
        return "Which movie are you asking about?"

    if intent in ("book_ticket", "search_service"):
        prompts = {
            "service_type": "What type of ticket do you want: bus, train, flight, movie, or event?",
            "source": "From which city should I search?",
            "destination": "Where do you want to go?",
            "date": "Which date should I search for?",
            "seats": "How many seats do you need?",
            "movie_name": "Which movie are you looking for?",
        }
        if missing:
            return prompts[missing[0]]

        if stype == "movie":
            if movie_name and date:
                return f"Searching for {movie_name} on {date}. Here are the available options:"
            if movie_name:
                return f"Searching for {movie_name}. Here are the available options:"
            return "Which movie are you looking for?"

        parts = [f"Searching for {stype} tickets"]
        if source and destination:
            parts.append(f"from {source} to {destination}")
        elif destination:
            parts.append(f"to {destination}")
        if date:
            parts.append(f"on {date}")
        if seats > 1:
            parts.append(f"for {seats} passengers")

        return ". ".join(parts) + ". Here are the available options:"

    return (
        "I am not sure I understood that. Try something like:\n"
        "'Book 2 bus tickets from Salem to Chennai tomorrow evening'\n"
        "or 'Show available movies today'."
    )


def process_message(text: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    intent, confidence = detect_intent(text)
    service_type = extract_service_type(text)
    source, destination = extract_cities(text)
    movie_name = extract_movie_name(text)
    city = extract_city(text)
    date = extract_date(text)
    seats = extract_seats(text)
    filters = extract_filters(text)
    selection = extract_selection(text) if intent == "select_result" else None

    context = context or {}
    text_lower = text.lower().strip()
    fresh_search = is_fresh_search(text_lower, service_type)
    use_context = not fresh_search

    if not service_type and source and destination and re.search(r"\bseat|ticket|travel|go\b", text_lower):
        service_type = "bus"

    if not service_type and (movie_name or (use_context and context.get("last_service_type") == "movie")):
        service_type = "movie"

    source = source or (context.get("source") if use_context else None)
    destination = destination or (context.get("destination") if use_context else None)
    movie_name = movie_name or ((context.get("movie_name") or context.get("last_movie_name")) if use_context else None)
    city = city or ((context.get("city") or context.get("last_city")) if use_context else None)
    if use_context and not date and intent in ("book_movie", "ask_available_dates", "ask_available_cities", "show_movies"):
        date = context.get("date") or context.get("last_date")

    entities = {
        "service_type": service_type,
        "source": source,
        "destination": destination,
        "movie_name": movie_name,
        "city": city,
        "date": date,
        "seats": seats,
        "filters": filters,
        "selection": selection,
    }
    if not entities.get("service_type") and entities.get("movie_name"):
        entities["service_type"] = "movie"

    entities["missing"] = missing_slots(intent, entities)

    response = generate_response(intent, entities)

    return {
        "intent": intent,
        "confidence": confidence,
        "entities": entities,
        "response": response,
    }


def is_fresh_search(text: str, service_type: Optional[str]) -> bool:
    if service_type and re.search(r"\b(book|reserve|buy|show|find|search|available|need|want)\b", text):
        return True
    if re.search(r"\b(book|reserve|buy|show|find|search|available)\b", text) and re.search(r"\b(bus|buses|train|trains|flight|flights|movie|movies|event|events|concert|comedy|cinema|film)\b", text):
        return True
    if re.search(r"\b(i want|i need|i'd like)\b", text) and re.search(r"\b(ticket|tickets|seat|seats|pass|passes)\b", text):
        return True
    return False
