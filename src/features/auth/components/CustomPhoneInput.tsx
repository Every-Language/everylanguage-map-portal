import React, { useState, useEffect, useRef } from 'react';
import { parsePhoneNumber, getCountryCallingCode, getCountries } from 'libphonenumber-js';
import type { CountryCode } from 'libphonenumber-js';

interface CountryOption {
  code: CountryCode;
  name: string;
  callingCode: string;
  flag: string;
}

interface CustomPhoneInputProps {
  value?: string;
  onChange: (value: string | undefined) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  label?: string;
  required?: boolean;
}

// Comprehensive country data with flags and names
const getCountryFlag = (countryCode: string): string => {
  const flags: Record<string, string> = {
    // Popular countries
    US: '🇺🇸', CA: '🇨🇦', GB: '🇬🇧', AU: '🇦🇺', DE: '🇩🇪', FR: '🇫🇷', 
    IT: '🇮🇹', ES: '🇪🇸', NL: '🇳🇱', SE: '🇸🇪', NO: '🇳🇴', DK: '🇩🇰',
    FI: '🇫🇮', PL: '🇵🇱', CZ: '🇨🇿', AT: '🇦🇹', CH: '🇨🇭', BE: '🇧🇪',
    IN: '🇮🇳', CN: '🇨🇳', JP: '🇯🇵', KR: '🇰🇷', BR: '🇧🇷', MX: '🇲🇽',
    AR: '🇦🇷', CL: '🇨🇱', CO: '🇨🇴', PE: '🇵🇪', VE: '🇻🇪', ZA: '🇿🇦',
    NG: '🇳🇬', EG: '🇪🇬', MA: '🇲🇦', KE: '🇰🇪', GH: '🇬🇭', TN: '🇹🇳',
    RU: '🇷🇺', TR: '🇹🇷', IL: '🇮🇱', AE: '🇦🇪', SA: '🇸🇦', QA: '🇶🇦',
    PK: '🇵🇰', BD: '🇧🇩', LK: '🇱🇰', TH: '🇹🇭', VN: '🇻🇳', MY: '🇲🇾',
    SG: '🇸🇬', ID: '🇮🇩', PH: '🇵🇭', NZ: '🇳🇿', IR: '🇮🇷', IQ: '🇮🇶',
    
    // European countries
    PT: '🇵🇹', IE: '🇮🇪', LU: '🇱🇺', GR: '🇬🇷', HU: '🇭🇺', RO: '🇷🇴',
    BG: '🇧🇬', HR: '🇭🇷', SI: '🇸🇮', SK: '🇸🇰', EE: '🇪🇪', LV: '🇱🇻',
    LT: '🇱🇹', MT: '🇲🇹', CY: '🇨🇾', IS: '🇮🇸', BY: '🇧🇾', UA: '🇺🇦',
    MD: '🇲🇩', MK: '🇲🇰', AL: '🇦🇱', ME: '🇲🇪', RS: '🇷🇸', BA: '🇧🇦',
    XK: '🇽🇰', LI: '🇱🇮', AD: '🇦🇩', MC: '🇲🇨', SM: '🇸🇲', VA: '🇻🇦',
    
    // African countries
    DZ: '🇩🇿', LY: '🇱🇾', SD: '🇸🇩', ET: '🇪🇹', UG: '🇺🇬', TZ: '🇹🇿',
    MZ: '🇲🇿', MG: '🇲🇬', AO: '🇦🇴', ZM: '🇿🇲', ZW: '🇿🇼', BW: '🇧🇼',
    NA: '🇳🇦', SZ: '🇸🇿', LS: '🇱🇸', MW: '🇲🇼', RW: '🇷🇼', BI: '🇧🇮',
    DJ: '🇩🇯', SO: '🇸🇴', ER: '🇪🇷', SS: '🇸🇸', CF: '🇨🇫', TD: '🇹🇩',
    CM: '🇨🇲', GQ: '🇬🇶', GA: '🇬🇦', CG: '🇨🇬', CD: '🇨🇩', ST: '🇸🇹',
    CV: '🇨🇻', GN: '🇬🇳', GW: '🇬🇼', SL: '🇸🇱', LR: '🇱🇷', CI: '🇨🇮',
    BF: '🇧🇫', ML: '🇲🇱', NE: '🇳🇪', SN: '🇸🇳', GM: '🇬🇲', MR: '🇲🇷',
    
    // Asian countries
    AF: '🇦🇫', UZ: '🇺🇿', TJ: '🇹🇯', KG: '🇰🇬', KZ: '🇰🇿', TM: '🇹🇲',
    MN: '🇲🇳', KP: '🇰🇵', LA: '🇱🇦', KH: '🇰🇭', MM: '🇲🇲', NP: '🇳🇵',
    BT: '🇧🇹', MV: '🇲🇻', BN: '🇧🇳', TL: '🇹🇱', TW: '🇹🇼',
    HK: '🇭🇰', MO: '🇲🇴', AM: '🇦🇲', AZ: '🇦��', GE: '🇬🇪',
    
    // American countries
    GT: '🇬🇹', BZ: '🇧🇿', SV: '🇸🇻', HN: '🇭🇳', NI: '🇳🇮', CR: '🇨🇷',
    PA: '🇵🇦', CU: '🇨🇺', JM: '🇯🇲', HT: '🇭🇹', DO: '🇩🇴', TT: '🇹🇹',
    BB: '🇧🇧', GD: '🇬🇩', LC: '🇱🇨', VC: '🇻🇨', AG: '🇦🇬', KN: '🇰🇳',
    DM: '🇩🇲', BS: '🇧🇸', SR: '🇸🇷', GY: '🇬🇾', UY: '🇺🇾', PY: '🇵🇾',
    BO: '🇧🇴', EC: '🇪🇨',
    
    // Middle East
    JO: '🇯🇴', LB: '🇱🇧', SY: '🇸🇾', PS: '🇵🇸', KW: '🇰🇼', BH: '🇧🇭',
    OM: '🇴🇲', YE: '🇾🇪',
    
    // Oceania
    FJ: '🇫🇯', PG: '🇵🇬', SB: '🇸🇧', VU: '🇻🇺', NC: '🇳🇨', PF: '🇵🇫',
    WS: '🇼🇸', TO: '🇹🇴', TV: '🇹🇻', NR: '🇳🇷', KI: '🇰🇮', PW: '🇵🇼',
    FM: '🇫🇲', MH: '🇲🇭', MP: '🇲🇵', GU: '🇬🇺', AS: '🇦🇸', CK: '🇨🇰',
    NU: '🇳🇺', TK: '🇹🇰', WF: '🇼🇫',
    
    // Other territories and dependencies
    PR: '🇵🇷', VI: '🇻🇮', AI: '🇦🇮', BM: '🇧🇲', VG: '🇻🇬', KY: '🇰🇾',
    MS: '🇲🇸', TC: '🇹🇨', FK: '🇫🇰', GI: '🇬🇮', GG: '🇬🇬', JE: '🇯🇪',
    IM: '🇮🇲', FO: '🇫🇴', GL: '🇬🇱', SJ: '🇸🇯', AX: '🇦🇽', PM: '🇵🇲',
    MQ: '🇲🇶', GP: '🇬🇵', GF: '🇬🇫', RE: '🇷🇪', YT: '🇾🇹', BL: '🇧🇱',
    MF: '🇲🇫', SX: '🇸🇽', CW: '🇨🇼', AW: '🇦🇼', BQ: '🇧🇶', SH: '🇸🇭',
    AC: '🇦🇨', TA: '🇹🇦', IO: '🇮🇴', CC: '🇨🇨', CX: '🇨🇽', NF: '🇳🇫',
    HM: '🇭🇲', AQ: '🇦🇶', BV: '🇧🇻', GS: '🇬🇸', TF: '🇹🇫', UM: '🇺🇲',
  };
  return flags[countryCode] || '🏳️';
};

const getCountryName = (countryCode: string): string => {
  const names: Record<string, string> = {
    // Popular countries
    US: 'United States', CA: 'Canada', GB: 'United Kingdom', AU: 'Australia',
    DE: 'Germany', FR: 'France', IT: 'Italy', ES: 'Spain', NL: 'Netherlands',
    SE: 'Sweden', NO: 'Norway', DK: 'Denmark', FI: 'Finland', PL: 'Poland',
    CZ: 'Czech Republic', AT: 'Austria', CH: 'Switzerland', BE: 'Belgium',
    IN: 'India', CN: 'China', JP: 'Japan', KR: 'South Korea', BR: 'Brazil',
    MX: 'Mexico', AR: 'Argentina', CL: 'Chile', CO: 'Colombia', PE: 'Peru',
    VE: 'Venezuela', ZA: 'South Africa', NG: 'Nigeria', EG: 'Egypt',
    MA: 'Morocco', KE: 'Kenya', GH: 'Ghana', TN: 'Tunisia', RU: 'Russia',
    TR: 'Turkey', IL: 'Israel', AE: 'United Arab Emirates', SA: 'Saudi Arabia',
    QA: 'Qatar', PK: 'Pakistan', BD: 'Bangladesh', LK: 'Sri Lanka',
    TH: 'Thailand', VN: 'Vietnam', MY: 'Malaysia', SG: 'Singapore',
    ID: 'Indonesia', PH: 'Philippines', NZ: 'New Zealand', IR: 'Iran', IQ: 'Iraq',
    
    // European countries
    PT: 'Portugal', IE: 'Ireland', LU: 'Luxembourg', GR: 'Greece', HU: 'Hungary',
    RO: 'Romania', BG: 'Bulgaria', HR: 'Croatia', SI: 'Slovenia', SK: 'Slovakia',
    EE: 'Estonia', LV: 'Latvia', LT: 'Lithuania', MT: 'Malta', CY: 'Cyprus',
    IS: 'Iceland', BY: 'Belarus', UA: 'Ukraine', MD: 'Moldova', MK: 'North Macedonia',
    AL: 'Albania', ME: 'Montenegro', RS: 'Serbia', BA: 'Bosnia and Herzegovina',
    XK: 'Kosovo', LI: 'Liechtenstein', AD: 'Andorra', MC: 'Monaco', SM: 'San Marino',
    VA: 'Vatican City',
    
    // African countries
    DZ: 'Algeria', LY: 'Libya', SD: 'Sudan', ET: 'Ethiopia', UG: 'Uganda',
    TZ: 'Tanzania', MZ: 'Mozambique', MG: 'Madagascar', AO: 'Angola', ZM: 'Zambia',
    ZW: 'Zimbabwe', BW: 'Botswana', NA: 'Namibia', SZ: 'Eswatini', LS: 'Lesotho',
    MW: 'Malawi', RW: 'Rwanda', BI: 'Burundi', DJ: 'Djibouti', SO: 'Somalia',
    ER: 'Eritrea', SS: 'South Sudan', CF: 'Central African Republic', TD: 'Chad',
    CM: 'Cameroon', GQ: 'Equatorial Guinea', GA: 'Gabon', CG: 'Republic of the Congo',
    CD: 'Democratic Republic of the Congo', ST: 'São Tomé and Príncipe', CV: 'Cape Verde',
    GN: 'Guinea', GW: 'Guinea-Bissau', SL: 'Sierra Leone', LR: 'Liberia',
    CI: 'Côte d\'Ivoire', BF: 'Burkina Faso', ML: 'Mali', NE: 'Niger',
    SN: 'Senegal', GM: 'Gambia', MR: 'Mauritania',
    
    // Asian countries
    AF: 'Afghanistan', UZ: 'Uzbekistan', TJ: 'Tajikistan', KG: 'Kyrgyzstan',
    KZ: 'Kazakhstan', TM: 'Turkmenistan', MN: 'Mongolia', KP: 'North Korea',
    LA: 'Laos', KH: 'Cambodia', MM: 'Myanmar', NP: 'Nepal', BT: 'Bhutan',
    MV: 'Maldives', BN: 'Brunei', TL: 'Timor-Leste', TW: 'Taiwan', HK: 'Hong Kong',
    MO: 'Macau', AM: 'Armenia', AZ: 'Azerbaijan', GE: 'Georgia',
    
    // American countries
    GT: 'Guatemala', BZ: 'Belize', SV: 'El Salvador', HN: 'Honduras', NI: 'Nicaragua',
    CR: 'Costa Rica', PA: 'Panama', CU: 'Cuba', JM: 'Jamaica', HT: 'Haiti',
    DO: 'Dominican Republic', TT: 'Trinidad and Tobago', BB: 'Barbados',
    GD: 'Grenada', LC: 'Saint Lucia', VC: 'Saint Vincent and the Grenadines',
    AG: 'Antigua and Barbuda', KN: 'Saint Kitts and Nevis', DM: 'Dominica',
    BS: 'Bahamas', SR: 'Suriname', GY: 'Guyana', UY: 'Uruguay', PY: 'Paraguay',
    BO: 'Bolivia', EC: 'Ecuador',
    
    // Middle East
    JO: 'Jordan', LB: 'Lebanon', SY: 'Syria', PS: 'Palestine', KW: 'Kuwait',
    BH: 'Bahrain', OM: 'Oman', YE: 'Yemen',
    
    // Oceania
    FJ: 'Fiji', PG: 'Papua New Guinea', SB: 'Solomon Islands', VU: 'Vanuatu',
    NC: 'New Caledonia', PF: 'French Polynesia', WS: 'Samoa', TO: 'Tonga',
    TV: 'Tuvalu', NR: 'Nauru', KI: 'Kiribati', PW: 'Palau', FM: 'Micronesia',
    MH: 'Marshall Islands', MP: 'Northern Mariana Islands', GU: 'Guam',
    AS: 'American Samoa', CK: 'Cook Islands', NU: 'Niue', TK: 'Tokelau',
    WF: 'Wallis and Futuna',
    
    // Other territories and dependencies
    PR: 'Puerto Rico', VI: 'U.S. Virgin Islands', AI: 'Anguilla', BM: 'Bermuda',
    VG: 'British Virgin Islands', KY: 'Cayman Islands', MS: 'Montserrat',
    TC: 'Turks and Caicos Islands', FK: 'Falkland Islands', GI: 'Gibraltar',
    GG: 'Guernsey', JE: 'Jersey', IM: 'Isle of Man', FO: 'Faroe Islands',
    GL: 'Greenland', SJ: 'Svalbard and Jan Mayen', AX: 'Åland Islands',
    PM: 'Saint Pierre and Miquelon', MQ: 'Martinique', GP: 'Guadeloupe',
    GF: 'French Guiana', RE: 'Réunion', YT: 'Mayotte', BL: 'Saint Barthélemy',
    MF: 'Saint Martin', SX: 'Sint Maarten', CW: 'Curaçao', AW: 'Aruba',
    BQ: 'Caribbean Netherlands', SH: 'Saint Helena', AC: 'Ascension Island',
    TA: 'Tristan da Cunha', IO: 'British Indian Ocean Territory',
    CC: 'Cocos Islands', CX: 'Christmas Island', NF: 'Norfolk Island',
    HM: 'Heard and McDonald Islands', AQ: 'Antarctica', BV: 'Bouvet Island',
    GS: 'South Georgia and the South Sandwich Islands', TF: 'French Southern Territories',
    UM: 'United States Minor Outlying Islands',
  };
  return names[countryCode] || countryCode;
};

export const CustomPhoneInput: React.FC<CustomPhoneInputProps> = ({
  value = '',
  onChange,
  onBlur,
  placeholder = 'Enter your phone number',
  disabled = false,
  error,
  label,
  required = false,
}) => {
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>('US');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Generate country options
  const countryOptions: CountryOption[] = getCountries().map(code => ({
    code,
    name: getCountryName(code),
    callingCode: getCountryCallingCode(code),
    flag: getCountryFlag(code),
  })).sort((a, b) => a.name.localeCompare(b.name));

  // Filter countries based on search
  const filteredCountries = countryOptions.filter(country =>
    country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    country.callingCode.includes(searchTerm) ||
    country.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Reset selected index when search results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchTerm]);

  // Parse initial value
  useEffect(() => {
    if (value) {
      try {
        const parsed = parsePhoneNumber(value);
        if (parsed) {
          setSelectedCountry(parsed.country || 'US');
          setPhoneNumber(parsed.nationalNumber);
        }
      } catch {
        // If parsing fails, just set the value as phone number
        setPhoneNumber(value.replace(/^\+\d{1,4}/, ''));
      }
    } else {
      // Clear phone number if value is empty
      setPhoneNumber('');
    }
  }, []); // Only run on mount, don't depend on value

  // Update parent when values change (with debouncing to prevent loops)
  useEffect(() => {
    const callingCode = getCountryCallingCode(selectedCountry);
    const fullNumber = phoneNumber ? `+${callingCode}${phoneNumber}` : '';
    
    // Only update if the new value is actually different
    if (fullNumber !== value) {
      onChange(fullNumber || undefined);
    }
  }, [selectedCountry, phoneNumber]); // Don't include value or onChange in dependencies

  // Handle keyboard navigation in dropdown
  const handleDropdownKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, filteredCountries.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredCountries[selectedIndex]) {
          setSelectedCountry(filteredCountries[selectedIndex].code);
          setShowDropdown(false);
          setSearchTerm('');
          inputRef.current?.focus();
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowDropdown(false);
        setSearchTerm('');
        inputRef.current?.focus();
        break;
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-focus search when dropdown opens
  useEffect(() => {
    if (showDropdown && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [showDropdown]);

  const selectedCountryOption = countryOptions.find(c => c.code === selectedCountry);

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
          {label}
          {required && <span className="text-error-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative" ref={dropdownRef}>
        <div className={`
          relative flex items-center
          border-2 rounded-xl transition-all duration-200
          ${error 
            ? 'border-error-300 dark:border-error-600' 
            : isInputFocused 
            ? 'border-primary-300 dark:border-primary-600' 
            : 'border-neutral-200 dark:border-neutral-600'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          bg-neutral-50 dark:bg-neutral-800
        `}>
          {/* Country Selector */}
          <button
            type="button"
            onClick={() => {
              if (!disabled) {
                setShowDropdown(!showDropdown);
              }
            }}
            disabled={disabled}
            className={`
              flex items-center space-x-2 px-3 py-3 rounded-l-xl
              hover:bg-neutral-100 dark:hover:bg-neutral-700
              transition-colors duration-200
              ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
              border-r border-neutral-200 dark:border-neutral-600
            `}
          >
            <span className="text-lg">{selectedCountryOption?.flag}</span>
            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              +{selectedCountryOption?.callingCode}
            </span>
            <svg 
              className={`w-4 h-4 text-neutral-500 transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Phone Number Input */}
          <input
            ref={inputRef}
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => {
              setIsInputFocused(false);
              onBlur?.();
            }}
            placeholder={placeholder}
            disabled={disabled}
            className={`
              flex-1 px-3 py-3 rounded-r-xl
              bg-transparent
              text-neutral-900 dark:text-neutral-100
              placeholder-neutral-400 dark:placeholder-neutral-500
              focus:outline-none
              ${disabled ? 'cursor-not-allowed' : ''}
            `}
          />
        </div>

        {/* Country Dropdown */}
        {showDropdown && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-600 rounded-xl shadow-lg z-50 max-h-60 overflow-hidden">
            {/* Search */}
            <div className="p-3 border-b border-neutral-200 dark:border-neutral-600">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search countries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleDropdownKeyDown}
                className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-600 rounded-lg bg-neutral-50 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:border-primary-300 dark:focus:border-primary-600"
              />
            </div>
            
            {/* Country List */}
            <div className="max-h-40 overflow-y-auto">
              {filteredCountries.map((country, index) => (
                <button
                  key={country.code}
                  type="button"
                  onClick={() => {
                    setSelectedCountry(country.code);
                    setShowDropdown(false);
                    setSearchTerm('');
                    inputRef.current?.focus();
                  }}
                  className={`
                    w-full flex items-center space-x-3 px-3 py-2 text-left
                    hover:bg-neutral-100 dark:hover:bg-neutral-700
                    transition-colors duration-150
                    ${selectedCountry === country.code ? 'bg-primary-50 dark:bg-primary-900/20' : ''}
                    ${index === selectedIndex ? 'bg-neutral-100 dark:bg-neutral-700' : ''}
                  `}
                >
                  <span className="text-lg">{country.flag}</span>
                  <span className="flex-1 text-sm text-neutral-900 dark:text-neutral-100">
                    {country.name}
                  </span>
                  <span className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                    +{country.callingCode}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {error && (
        <p className="text-sm text-error-600 dark:text-error-400 mt-1">
          {error}
        </p>
      )}
    </div>
  );
}; 