import * as React from "react";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import type { AppProps } from "next/app";
import Head from "next/head";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: { 
      main: "#3B82F6",
      light: "#60A5FA",
      dark: "#1D4ED8",
      50: "#EFF6FF",
      100: "#DBEAFE",
    },
    secondary: { 
      main: "#8B5CF6",
      light: "#A78BFA",
      dark: "#7C3AED",
      50: "#F5F3FF",
    },
    success: {
      main: "#10B981",
      light: "#34D399",
      dark: "#059669",
      50: "#ECFDF5",
    },
    warning: {
      main: "#F59E0B",
      light: "#FBBF24",
      dark: "#D97706",
      50: "#FFFBEB",
    },
    error: {
      main: "#EF4444",
      light: "#F87171",
      dark: "#DC2626",
      50: "#FEF2F2",
    },
    background: {
      default: "#F8FAFC",
      paper: "#FFFFFF"
    },
    text: {
      primary: "#0F172A",
      secondary: "#64748B"
    },
    grey: {
      50: "#F8FAFC",
      100: "#F1F5F9",
      200: "#E2E8F0",
      300: "#CBD5E1",
      400: "#94A3B8",
      500: "#64748B",
      600: "#475569",
      700: "#334155",
      800: "#1E293B",
      900: "#0F172A"
    }
  },
  shape: { 
    borderRadius: 12 
  },
  typography: {
    fontFamily: '"Pretendard Variable", "Pretendard", -apple-system, BlinkMacSystemFont, system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 800,
      lineHeight: 1.2,
      letterSpacing: '-0.02em',
      color: '#0F172A'
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 700,
      lineHeight: 1.3,
      letterSpacing: '-0.01em',
      color: '#0F172A'
    },
    h3: {
      fontSize: '1.5rem',
      fontWeight: 700,
      lineHeight: 1.4,
      letterSpacing: '-0.01em',
      color: '#0F172A'
    },
    h4: {
      fontSize: '1.25rem',
      fontWeight: 700,
      lineHeight: 1.4,
      color: '#0F172A'
    },
    h5: {
      fontSize: '1.125rem',
      fontWeight: 600,
      lineHeight: 1.4,
      color: '#0F172A'
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
      lineHeight: 1.5,
      color: '#0F172A'
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.7,
      color: '#334155'
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.6,
      color: '#64748B'
    },
    subtitle1: {
      fontSize: '1rem',
      fontWeight: 500,
      lineHeight: 1.6,
      color: '#334155'
    },
    subtitle2: {
      fontSize: '0.875rem',
      fontWeight: 500,
      lineHeight: 1.6,
      color: '#64748B'
    },
    caption: {
      fontSize: '0.75rem',
      lineHeight: 1.5,
      color: '#94A3B8'
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
    }
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        '@font-face': {
          fontFamily: 'Pretendard Variable',
          fontWeight: '45 920',
          fontStyle: 'normal',
          fontDisplay: 'swap',
          src: 'url(https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.woff2) format("woff2-variations")',
        },
        body: {
          scrollBehavior: 'smooth',
        },
        '*::-webkit-scrollbar': {
          width: '8px',
          height: '8px',
        },
        '*::-webkit-scrollbar-track': {
          background: '#F1F5F9',
          borderRadius: '4px',
        },
        '*::-webkit-scrollbar-thumb': {
          background: '#CBD5E1',
          borderRadius: '4px',
          '&:hover': {
            background: '#94A3B8',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        elevation0: {
          boxShadow: 'none',
        },
        elevation1: {
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        },
        elevation2: {
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        },
        elevation3: {
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        },
        elevation4: {
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        },
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 10,
          padding: '10px 20px',
          transition: 'all 0.2s ease-in-out',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
          }
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
          }
        },
        outlined: {
          borderWidth: '1.5px',
          '&:hover': {
            borderWidth: '1.5px',
          }
        },
        outlinedPrimary: {
          borderColor: '#3B82F6',
          '&:hover': {
            backgroundColor: '#EFF6FF',
          }
        },
        text: {
          '&:hover': {
            backgroundColor: '#F1F5F9',
          }
        },
        sizeLarge: {
          padding: '12px 28px',
          fontSize: '1rem',
        },
        sizeSmall: {
          padding: '6px 14px',
          fontSize: '0.813rem',
        },
      }
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            backgroundColor: '#F1F5F9',
          }
        }
      }
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 10,
            transition: 'all 0.2s ease-in-out',
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: '#94A3B8',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#3B82F6',
              borderWidth: '2px',
            },
          },
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: '#E2E8F0',
          },
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
          transition: 'all 0.2s ease-in-out',
        }
      }
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 600,
          fontSize: '0.75rem',
        },
        filled: {
          '&.MuiChip-colorPrimary': {
            background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
          },
          '&.MuiChip-colorSuccess': {
            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
          },
          '&.MuiChip-colorWarning': {
            background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
          },
          '&.MuiChip-colorError': {
            background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
          },
        }
      }
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 20,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }
      }
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontWeight: 700,
          fontSize: '1.25rem',
        }
      }
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          height: 3,
          borderRadius: '3px 3px 0 0',
          background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
        }
      }
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '0.875rem',
          minHeight: 48,
          '&.Mui-selected': {
            color: '#3B82F6',
          }
        }
      }
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          height: 6,
          backgroundColor: '#E2E8F0',
        },
        bar: {
          borderRadius: 8,
          background: 'linear-gradient(90deg, #3B82F6 0%, #8B5CF6 100%)',
        }
      }
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
        standardSuccess: {
          backgroundColor: '#ECFDF5',
          color: '#059669',
        },
        standardError: {
          backgroundColor: '#FEF2F2',
          color: '#DC2626',
        },
        standardWarning: {
          backgroundColor: '#FFFBEB',
          color: '#D97706',
        },
        standardInfo: {
          backgroundColor: '#EFF6FF',
          color: '#2563EB',
        },
      }
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: 12,
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.12)',
          border: '1px solid #E2E8F0',
        }
      }
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          margin: '2px 8px',
          padding: '8px 12px',
          '&:hover': {
            backgroundColor: '#F1F5F9',
          },
          '&.Mui-selected': {
            backgroundColor: '#EFF6FF',
            '&:hover': {
              backgroundColor: '#DBEAFE',
            }
          }
        }
      }
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: '#1E293B',
          borderRadius: 8,
          fontSize: '0.75rem',
          fontWeight: 500,
          padding: '8px 12px',
        },
        arrow: {
          color: '#1E293B',
        }
      }
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          fontWeight: 600,
        }
      }
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: '#E2E8F0',
        }
      }
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 700,
          color: '#475569',
          backgroundColor: '#F8FAFC',
          borderBottom: '2px solid #E2E8F0',
        },
        body: {
          borderBottom: '1px solid #F1F5F9',
        }
      }
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:last-child td, &:last-child th': {
            borderBottom: 0,
          },
        }
      }
    },
  }
});

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Head>
        <title>SurveyMachine - 설문조사 시스템</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="간편하게 설문을 만들고 배포하세요. AI 기반 PDF 설문 자동 생성, 실시간 응답 분석" />
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link 
          rel="stylesheet" 
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css" 
        />
      </Head>
      <Component {...pageProps} />
    </ThemeProvider>
  );
}
