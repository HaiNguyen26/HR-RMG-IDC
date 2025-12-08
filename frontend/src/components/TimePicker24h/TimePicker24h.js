import React, { useState, useRef, useEffect } from 'react';
import './TimePicker24h.css';

const TimePicker24h = ({ value, onChange, className = '', placeholder = '--:--', minuteStep = 1 }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const wrapperRef = useRef(null);
  const hoursGridRef = useRef(null);
  const minutesGridRef = useRef(null);

  // Parse value to hours and minutes
  useEffect(() => {
    if (value && value.includes(':')) {
      const [h, m] = value.split(':');
      setHours(h || '');
      setMinutes(m || '');
    } else {
      setHours('');
      setMinutes('');
    }
  }, [value]);

  // Scroll to selected value when dropdown opens
  useEffect(() => {
    if (isOpen) {
      // Scroll to selected hour
      if (hoursGridRef.current && hours !== '') {
        const hourIndex = parseInt(hours, 10);
        const hourButton = hoursGridRef.current.children[hourIndex];
        if (hourButton) {
          hourButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
      
      // Scroll to selected minute
      if (minutesGridRef.current && minutes !== '') {
        const minuteValue = parseInt(minutes, 10);
        // Tính index dựa trên minuteStep
        const minuteIndex = Math.floor(minuteValue / minuteStep);
        const minuteButton = minutesGridRef.current.children[minuteIndex];
        if (minuteButton) {
          minuteButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  }, [isOpen, hours, minutes]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleHourSelect = (hour) => {
    const newHours = hour.toString().padStart(2, '0');
    setHours(newHours);
    const timeValue = `${newHours}:${minutes || '00'}`;
    onChange({ target: { value: timeValue } });
  };

  const handleMinuteSelect = (minute) => {
    const newMinutes = minute.toString().padStart(2, '0');
    setMinutes(newMinutes);
    const timeValue = `${hours || '00'}:${newMinutes}`;
    onChange({ target: { value: timeValue } });
  };

  const displayValue = value || placeholder;

  return (
    <div className={`time-picker-24h-wrapper ${className}`} ref={wrapperRef}>
      <div
        className="time-picker-24h-input"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={value ? 'time-picker-24h-value' : 'time-picker-24h-placeholder'}>
          {displayValue}
        </span>
        <svg className="time-picker-24h-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
      </div>

      {isOpen && (
        <div className="time-picker-24h-dropdown">
          <div className="time-picker-24h-section">
            <div className="time-picker-24h-label">Giờ</div>
            <div className="time-picker-24h-grid" ref={hoursGridRef}>
              {Array.from({ length: 24 }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  className={`time-picker-24h-option ${hours === i.toString().padStart(2, '0') ? 'selected' : ''}`}
                  onClick={() => handleHourSelect(i)}
                >
                  {i.toString().padStart(2, '0')}
                </button>
              ))}
            </div>
          </div>
          <div className="time-picker-24h-section">
            <div className="time-picker-24h-label">Phút</div>
            <div className="time-picker-24h-grid" ref={minutesGridRef}>
              {Array.from({ length: Math.floor(60 / minuteStep) }, (_, i) => {
                const minute = i * minuteStep;
                return (
                  <button
                    key={minute}
                    type="button"
                    className={`time-picker-24h-option ${minutes === minute.toString().padStart(2, '0') ? 'selected' : ''}`}
                    onClick={() => handleMinuteSelect(minute)}
                  >
                    {minute.toString().padStart(2, '0')}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimePicker24h;

