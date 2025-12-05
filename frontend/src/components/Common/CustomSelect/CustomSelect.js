import React, { useState, useEffect, useRef } from 'react';
import './CustomSelect.css';

const CustomSelect = ({
    id,
    name,
    value,
    onChange,
    options = [],
    placeholder = 'Chọn...',
    error,
    required = false,
    className = '',
    disabled = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const menuRef = useRef(null);

    const selectedOption = options.find(opt => String(opt.value) === String(value)) || null;
    const displayValue = selectedOption && String(selectedOption.value) !== ''
        ? selectedOption.label
        : placeholder;

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target) &&
                menuRef.current &&
                !menuRef.current.contains(event.target)
            ) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            setTimeout(() => {
                document.addEventListener('mousedown', handleClickOutside);
            }, 0);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    // Close dropdown on Escape key
    useEffect(() => {
        const handleEscape = (event) => {
            if (event.key === 'Escape' && isOpen) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen]);

    const handleToggle = (e) => {
        if (disabled) return;
        e.preventDefault();
        e.stopPropagation();
        setIsOpen(!isOpen);
    };

    const handleSelect = (option, e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        if (option.value === '' || option.value === null || option.value === undefined) {
            return; // Prevent selecting placeholder
        }

        const eventObject = {
            target: {
                name: name || id,
                value: option.value
            }
        };

        if (onChange) {
            onChange(eventObject);
        }

        setIsOpen(false);
    };

    // Filter out placeholder and invalid options
    const displayOptions = options.filter(opt =>
        opt.value !== '' &&
        opt.value !== null &&
        opt.value !== undefined &&
        opt.label !== null &&
        opt.label !== undefined
    );

    return (
        <div
            className={`custom-select-wrapper ${className} ${error ? 'has-error' : ''} ${disabled ? 'disabled' : ''} ${isOpen ? 'is-open' : ''}`}
            ref={dropdownRef}
        >
            <button
                type="button"
                id={id}
                className={`custom-select-trigger ${isOpen ? 'open' : ''} ${error ? 'error' : ''} ${!selectedOption || String(selectedOption.value) === '' ? 'placeholder' : ''}`}
                onClick={handleToggle}
                disabled={disabled}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
            >
                <span className="custom-select-value">
                    {displayValue}
                </span>
                <svg
                    className={`custom-select-arrow ${isOpen ? 'open' : ''}`}
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path
                        d="M4 6L8 10L12 6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            </button>

            {isOpen && !disabled && (
                <div
                    className="custom-select-menu"
                    ref={menuRef}
                    role="listbox"
                >
                    {displayOptions.length > 0 ? (
                        displayOptions.map((option, index) => {
                            const isSelected = String(value) === String(option.value);
                            return (
                                <button
                                    key={`${option.value}-${index}`}
                                    type="button"
                                    className={`custom-select-option ${isSelected ? 'selected' : ''}`}
                                    onClick={(e) => handleSelect(option, e)}
                                    role="option"
                                    aria-selected={isSelected}
                                >
                                    <span className="option-label">{option.label}</span>
                                    {isSelected && (
                                        <svg
                                            className="option-check"
                                            width="16"
                                            height="16"
                                            viewBox="0 0 16 16"
                                            fill="none"
                                        >
                                            <path
                                                d="M13.3333 4L6 11.3333L2.66667 8"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            />
                                        </svg>
                                    )}
                                </button>
                            );
                        })
                    ) : (
                        <div className="custom-select-empty">
                            <span>Không có dữ liệu</span>
                        </div>
                    )}
                </div>
            )}

            {error && (
                <span className="custom-select-error">{error}</span>
            )}
        </div>
    );
};

export default CustomSelect;

