// קובץ הגדרות תמחור – גרסת מחשבון האירועים
window.WINERY_CONFIG = {
  "branding": {
    "logoDataUrl": "",
    "logoWidthPt": 120,
    "logoHeightPt": 40,
    "fontUrl": "",
    "fontDataUrl": "",
    "internalReportTitle": "יקב אולו - דוח תמחור פנימי",
    "footerLines": [
      "יקב אולו • hello@ulu-winery.co.il • טל׳ 03-0000000",
      "כתובת: דרך היין 1, הגליל העליון"
    ]
  },
  "vat": 0.18,
  "children": {
    "factor": 0.75
  },
  "events": {
    "minimumGuests": 20
  },
  "staffing": {
    "workerRate_exVAT": 550,
    "managerBonus_exVAT": 500,
    "revenueComponent_exVAT": 100,
    "workerMatrix": [
      {
        "minGuests": 20,
        "maxGuests": 39,
        "our_food": 1,
        "catering": 1
      },
      {
        "minGuests": 40,
        "maxGuests": 59,
        "our_food": 2,
        "catering": 2
      },
      {
        "minGuests": 60,
        "maxGuests": 79,
        "our_food": 3,
        "catering": 2
      },
      {
        "minGuests": 80,
        "maxGuests": 100,
        "our_food": 4,
        "catering": 3
      }
    ]
  },
  "food": {
    "winery": {
      "price_incVAT": 181,
      "cost_exVAT": 46
    },
    "extras": {
      "quiches": {
        "id": "menu_extra_quiches",
        "label": "קישים",
        "price_incVAT": 33,
        "cost_exVAT": 8,
        "appliesTo": "winery",
        "perGuestMode": "adult_equivalent",
        "excludeFromBase": true
      },
      "pizza": {
        "id": "menu_extra_pizza",
        "label": "פיצה",
        "price_incVAT": 25,
        "cost_exVAT": 7,
        "appliesTo": "winery",
        "perGuestMode": "adult_equivalent",
        "excludeFromBase": true
      },
      "snack": {
        "id": "menu_extra_snack",
        "label": "נישנוש בוקר לקבוצות",
        "price_incVAT": 88,
        "cost_exVAT": 21,
        "appliesTo": "winery",
        "perGuestMode": "adult_equivalent",
        "excludeFromBase": true
      }
    },
    "catering_we_bring": {
      "markup_percent": 15
    },
    "catering_client_brings": {
      "fee_per_guest_exVAT": 40
    },
    "child_food_factor": 0.75
  },
  "drinks": {
    "hot": {
      "costPerUnit": 5.5,
      "pricePerUnit": 17.6
    },
    "cold": {
      "costPerUnit": 5,
      "pricePerUnit": 17
    },
    "childHotMultiplier": 0.75,
    "childColdMultiplier": 1,
    "ratesByDuration": {
      "short": {
        "hot": 1,
        "cold": 1
      },
      "medium": {
        "hot": 1.5,
        "cold": 1.5
      },
      "long": {
        "hot": 2,
        "cold": 2
      }
    }
  },
  "wine": {
    "baseline": {
      "guestsPerBottle": 5,
      "ratio": {
        "white": 0.4,
        "rose": 0.4,
        "red": 0.2
      },
      "minimumGuestsForAllTypes": 20,
      "mixSplit": {
        "ulu": 0.7,
        "kosher": 0.30000000000000004
      }
    },
    "tiers": {
      "ulu": {
        "key": "ulu",
        "label": "יינות ULU",
        "cost_exVAT": {
          "white": 40,
          "rose": 40,
          "red": 55
        },
        "price_incVAT": {
          "white": 145,
          "rose": 145,
          "red": 189
        }
      },
      "kosher": {
        "key": "kosher",
        "label": "יינות כשרים",
        "cost_exVAT": {
          "white": 35,
          "rose": 35,
          "red": 35
        },
        "price_incVAT": {
          "white": 145,
          "rose": 145,
          "red": 145
        }
      }
    }
  },
  "revenueTargets": {
    "our_food": [
      {
        "guests": 20,
        "pct": 0.67
      },
      {
        "guests": 30,
        "pct": 0.59
      },
      {
        "guests": 40,
        "pct": 0.57
      },
      {
        "guests": 50,
        "pct": 0.59
      },
      {
        "guests": 60,
        "pct": 0.59
      },
      {
        "guests": 70,
        "pct": 0.6
      },
      {
        "guests": 80,
        "pct": 0.58
      },
      {
        "guests": 100,
        "pct": 0.55
      }
    ],
    "catering": [
      {
        "guests": 20,
        "pct": 0.68
      },
      {
        "guests": 30,
        "pct": 0.68
      },
      {
        "guests": 40,
        "pct": 0.68
      },
      {
        "guests": 50,
        "pct": 0.68
      },
      {
        "guests": 60,
        "pct": 0.68
      },
      {
        "guests": 70,
        "pct": 0.68
      },
      {
        "guests": 80,
        "pct": 0.68
      },
      {
        "guests": 100,
        "pct": 0.68
      }
    ],
    "customer_catering": [
      {
        "guests": 20,
        "pct": 0.48
      },
      {
        "guests": 30,
        "pct": 0.42
      },
      {
        "guests": 40,
        "pct": 0.39
      },
      {
        "guests": 50,
        "pct": 0.38
      },
      {
        "guests": 60,
        "pct": 0.38
      },
      {
        "guests": 70,
        "pct": 0.38
      },
      {
        "guests": 80,
        "pct": 0.3
      },
      {
        "guests": 100,
        "pct": 0.35
      }
    ]
  },
  "addons": {
    "we_bring": {
      "markup_percent": 0
    },
    "customer_brings": {
      "markup_percent": 0
    }
  },
  "pricing": {
    "venues": {
      "baseFees": [
        {
          "key": "inside",
          "label": "פנים",
          "baseFee_exVAT": 0,
          "cost_exVAT": 0,
          "locationMultiplier": 1
        },
        {
          "key": "outside",
          "label": "חוץ",
          "baseFee_exVAT": 0,
          "cost_exVAT": 0,
          "locationMultiplier": 1
        },
        {
          "key": "traklin",
          "label": "טרקלין",
          "baseFee_exVAT": 0,
          "cost_exVAT": 0,
          "locationMultiplier": 1
        },
        {
          "key": "combined",
          "label": "חוץ + פנים",
          "baseFee_exVAT": 0,
          "cost_exVAT": 0,
          "locationMultiplier": 1
        }
      ]
    },
    "place": {
      "venues": {}
    }
  }
};
