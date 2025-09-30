import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ActivityIndicator,
  StatusBar,
  Dimensions,
  Alert,
  Clipboard,
  ScrollView,
  Appearance,
  Modal,
  PanResponder,
  Keyboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Updates from 'expo-updates';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Path, Circle, Rect, Polygon } from 'react-native-svg';
import { fetch as expoFetch } from 'expo/fetch';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

const API_KEY = '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';
const API_URL = 'https://openrouter.ai/api/v1/chat/completions';

const GrokIcon = ({ size = 20, color = "#6366F1" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path 
      d="M12 2L3.09 8.26L12 22L20.91 8.26L12 2Z" 
      fill={color}
      stroke={color}
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <Circle cx="12" cy="10" r="2" fill="white" />
  </Svg>
);

const BrainIcon = ({ size = 20, color = "#8B5CF6" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path 
      d="M9.5 2C8.4 2 7.5 2.9 7.5 4C6.4 4 5.5 4.9 5.5 6C4.4 6 3.5 6.9 3.5 8C3.5 9.1 4.4 10 5.5 10H18.5C19.6 10 20.5 9.1 20.5 8C20.5 6.9 19.6 6 18.5 6C18.5 4.9 17.6 4 16.5 4C16.5 2.9 15.6 2 14.5 2H9.5Z" 
      fill={color}
    />
    <Path 
      d="M5.5 12V18C5.5 19.1 6.4 20 7.5 20H16.5C17.6 20 18.5 19.1 18.5 18V12" 
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
    <Circle cx="8" cy="15" r="1" fill="white" />
    <Circle cx="16" cy="15" r="1" fill="white" />
    <Path d="M10 17H14" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
  </Svg>
);

const LightningIcon = ({ size = 20, color = "#10B981" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path 
      d="M13 2L3 14H12L11 22L21 10H12L13 2Z" 
      fill={color}
      stroke={color}
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  </Svg>
);

const LightningIconpro = ({ size = 20, color = "#0dffe7" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path 
      d="M13 2L3 14H12L11 22L21 10H12L13 2Z" 
      fill={color}
      stroke={color}
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  </Svg>
);

const StopIcon = ({ size = 20, color = "#fff" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect 
      x="6" 
      y="6" 
      width="12" 
      height="12" 
      rx="2" 
      fill={color}
    />
  </Svg>
);

const AI_MODELS = [
  {
    id: 'grok-4',
    name: 'Grok 4',
    value: 'x-ai/grok-4-fast:free',
    icon: GrokIcon,
    color: '#6366F1'
  },
  {
    id: 'deephermes-3',
    name: 'DeepHermes',
    value: 'nousresearch/deephermes-3-llama-3-8b-preview:free',
    icon: BrainIcon,
    color: '#8B5CF6'
  },
  {
    id: 'nemotron',
    name: 'Nemotron',
    value: 'nvidia/nemotron-nano-9b-v2:free',
    icon: LightningIcon,
    color: '#10B981'
  },
  {
    id: 'deepcoder',
    name: 'DeepCoder',
    value: 'agentica-org/deepcoder-14b-preview:free',
    icon: LightningIconpro,
    color: '#59ffec'
  }
];

function App() {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [theme, setTheme] = useState('auto');
  const [showSettings, setShowSettings] = useState(false);
  const [copiedCodeId, setCopiedCodeId] = useState(null);
  const [selectedModel, setSelectedModel] = useState(AI_MODELS[0]);
  const [showModelDropdown, setShowModelDropdown] = useState(false);

  const [showSidebar, setShowSidebar] = useState(false);
  const [chatSessions, setChatSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);

  const [isStreaming, setIsStreaming] = useState(false);
  const streamAbortController = useRef(null);

  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  
  const flatListRef = useRef(null);
  const sendButtonScale = useRef(new Animated.Value(1)).current;
  const dropdownAnimation = useRef(new Animated.Value(0)).current;
  const dropdownOpacity = useRef(new Animated.Value(0)).current;
  const dropdownRotation = useRef(new Animated.Value(0)).current;
  const sidebarAnimation = useRef(new Animated.Value(-width * 0.8)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const inputContainerAnim = useRef(new Animated.Value(0)).current;

  const insets = useSafeAreaInsets();

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        const height = e.endCoordinates.height;
        setKeyboardHeight(height);
        setIsKeyboardVisible(true);
        Animated.timing(inputContainerAnim, {
          toValue: height,
          duration: 250,
          useNativeDriver: false,
        }).start();

        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );

    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
        setIsKeyboardVisible(false);
        Animated.timing(inputContainerAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: false,
        }).start();
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: (evt, gestureState) => {
      return Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
    },
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
    },
    onPanResponderMove: (evt, gestureState) => {
      if (gestureState.dx > 0 && gestureState.dx < width * 0.8) {
        if (!showSidebar && gestureState.dx > 50) {
          setShowSidebar(true);
        }
        if (showSidebar) {
          sidebarAnimation.setValue(Math.max(-width * 0.8, -width * 0.8 + gestureState.dx));
          overlayOpacity.setValue(Math.min(1, gestureState.dx / (width * 0.3)));
        } else {
          sidebarAnimation.setValue(-width * 0.8 + gestureState.dx);
          overlayOpacity.setValue(Math.min(1, gestureState.dx / (width * 0.3)));
        }
      } else if (gestureState.dx < 0 && showSidebar) {
        const newValue = Math.max(-width * 0.8, gestureState.dx);
        sidebarAnimation.setValue(newValue);
        overlayOpacity.setValue(Math.max(0, 1 + (gestureState.dx / (width * 0.3))));
      }
    },
    onPanResponderRelease: (evt, gestureState) => {
      if (gestureState.dx > width * 0.25 && !showSidebar) {
        setShowSidebar(true);
        Animated.parallel([
          Animated.spring(sidebarAnimation, {
            toValue: 0,
            useNativeDriver: true,
            tension: 100,
            friction: 8,
          }),
          Animated.timing(overlayOpacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          })
        ]).start();
      } else if (gestureState.dx < -width * 0.2 && showSidebar) {
        Animated.parallel([
          Animated.spring(sidebarAnimation, {
            toValue: -width * 0.8,
            useNativeDriver: true,
            tension: 100,
            friction: 8,
          }),
          Animated.timing(overlayOpacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          })
        ]).start(() => {
          setShowSidebar(false);
        });
      } else if (showSidebar) {
        Animated.parallel([
          Animated.spring(sidebarAnimation, {
            toValue: 0,
            useNativeDriver: true,
            tension: 100,
            friction: 8,
          }),
          Animated.timing(overlayOpacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          })
        ]).start();
      } else {
        Animated.parallel([
          Animated.spring(sidebarAnimation, {
            toValue: -width * 0.8,
            useNativeDriver: true,
            tension: 100,
            friction: 8,
          }),
          Animated.timing(overlayOpacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          })
        ]).start(() => {
          setShowSidebar(false);
        });
      }
    },
  });

  const themeColors = {
    dark: {
      background: '#0C0C0C',
      surface: '#161616',
      surfaceElevated: '#1E1E1E',
      text: '#FFFFFF',
      textSecondary: '#A1A1A1',
      textTertiary: '#6B7280',
      userBubble: '#2563EB',
      aiBubble: '#1A1A1A',
      border: '#262626',
      borderLight: '#1A1A1A',
      codeBackground: '#0A0A0A',
      codeHeader: '#1A1A1A',
      codeText: '#22C55E',
      dropdown: '#1E1E1E',
      dropdownBorder: '#2A2A2A',
      overlay: 'rgba(0, 0, 0, 0.6)',
      shadow: 'rgba(0, 0, 0, 0.3)',
      sidebarBackground: '#121212',
      sidebarSurface: '#1A1A1A',
      highlight: '#FFD700',
      boldText: '#FFFFFF',
      newChatButtonBg: '#FFFFFF',
      newChatButtonText: '#000000',
    },
    light: {
      background: '#FFFFFF',
      surface: '#F8FAFC',
      surfaceElevated: '#FFFFFF',
      text: '#0F172A',
      textSecondary: '#64748B',
      textTertiary: '#94A3B8',
      userBubble: '#2563EB',
      aiBubble: '#F1F5F9',
      border: '#E2E8F0',
      borderLight: '#F1F5F9',
      codeBackground: '#F8FAFC',
      codeHeader: '#E2E8F0',
      codeText: '#059669',
      dropdown: '#FFFFFF',
      dropdownBorder: '#E2E8F0',
      overlay: 'rgba(0, 0, 0, 0.4)',
      shadow: 'rgba(0, 0, 0, 0.1)',
      sidebarBackground: '#FAFAFA',
      sidebarSurface: '#FFFFFF',
      highlight: '#FF6B35',
      boldText: '#1F2937',
      newChatButtonBg: '#000000', 
      newChatButtonText: '#FFFFFF',
    }
  };

  const getCurrentTheme = () => {
    if (theme === 'auto') {
      return 'dark';
    }
    return theme;
  };

  const currentTheme = getCurrentTheme();
  const colors = themeColors[currentTheme] || themeColors.light;

  useEffect(() => {
    if (isStreaming) {
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.3,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimation.start();
      
      return () => pulseAnimation.stop();
    }
  }, [isStreaming, pulseAnim]);

  useEffect(() => {
    loadTheme();
    loadChatSessions();
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const loadChatSessions = async () => {
    try {
      const sessions = await AsyncStorage.getItem('chat_sessions');
      if (sessions) {
        setChatSessions(JSON.parse(sessions));
      }
    } catch (error) {
      console.error('Error loading chat sessions:', error);
    }
  };

  const saveChatSessions = async (sessions) => {
    try {
      await AsyncStorage.setItem('chat_sessions', JSON.stringify(sessions));
      setChatSessions(sessions);
    } catch (error) {
      console.error('Error saving chat sessions:', error);
    }
  };

  const createNewChatSession = async (userMessage, aiMessage) => {
    const sessionId = Date.now().toString();
    const sessionName = `Chat - ${new Date().toLocaleTimeString()}`;
    
    const newSession = {
      id: sessionId,
      name: sessionName,
      createdAt: new Date().toISOString(),
      messages: [userMessage, aiMessage],
      model: selectedModel.id
    };

    const updatedSessions = [newSession, ...chatSessions];
    await saveChatSessions(updatedSessions);
    return sessionId;
  };

  const updateCurrentSession = async (newMessages) => {
    if (!currentSessionId) return;

    const updatedSessions = chatSessions.map(session => 
      session.id === currentSessionId 
        ? { ...session, messages: newMessages }
        : session
    );
    
    await saveChatSessions(updatedSessions);
  };

  const loadChatSession = (session) => {
    setMessages([...session.messages]);
    setCurrentSessionId(session.id);
    setShowSidebar(false);
    
    const sessionModel = AI_MODELS.find(model => model.id === session.model) || AI_MODELS[0];
    setSelectedModel(sessionModel);
  };

  const startNewChat = () => {
    if (streamAbortController.current) {
      streamAbortController.current.abort();
    }
    setMessages([]);
    setCurrentSessionId(null);
    setShowSidebar(false);
    setIsStreaming(false);
  };

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('app_theme');
      if (savedTheme) {
        setTheme(savedTheme);
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  };

  const saveTheme = async (newTheme) => {
    try {
      await AsyncStorage.setItem('app_theme', newTheme);
      setTheme(newTheme);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const clearAllData = async () => {
    try {
      await AsyncStorage.clear();
      await Updates.reloadAsync();
    } catch (e) {
      console.log("Error clearing data or restarting app:", e);
    }
  };

  const confirmAndClear = () => {
    Alert.alert(
      "Reset App",
      "Are you sure you want to clear all data?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "OK", onPress: clearAllData },
      ]
    );
  };

  const toggleSidebar = () => {
    if (showSidebar) {
      Animated.parallel([
        Animated.timing(sidebarAnimation, {
          toValue: -width * 0.8,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start(() => {
        setShowSidebar(false);
      });
    } else {
      setShowSidebar(true);
      Animated.parallel([
        Animated.timing(sidebarAnimation, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start();
    }
  };

  const toggleModelDropdown = () => {
    if (showModelDropdown) {
      Animated.parallel([
        Animated.timing(dropdownOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(dropdownAnimation, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(dropdownRotation, { toValue: 0, duration: 200, useNativeDriver: true })
      ]).start(() => setShowModelDropdown(false));
    } else {
      setShowModelDropdown(true);
      Animated.parallel([
        Animated.timing(dropdownOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(dropdownAnimation, { toValue: 1, useNativeDriver: true, tension: 180, friction: 12 }),
        Animated.timing(dropdownRotation, { toValue: 1, duration: 200, useNativeDriver: true })
      ]).start();
    }
  };

  const selectModel = (model) => {
    setSelectedModel(model);
    toggleModelDropdown();
  };

  const animateSendButton = () => {
    Animated.sequence([
      Animated.timing(sendButtonScale, { toValue: 0.9, duration: 100, useNativeDriver: true }),
      Animated.spring(sendButtonScale, { toValue: 1, useNativeDriver: true, tension: 200, friction: 4 }),
    ]).start();
  };

  const copyToClipboard = async (text, codeId) => {
    try {
      await Clipboard.setString(text);
      setCopiedCodeId(codeId);
      setTimeout(() => setCopiedCodeId(null), 2000);
    } catch (error) {
      Alert.alert('Error', 'Failed to copy text');
    }
  };

  const parseMarkdown = (text) => {
    if (!text) return [{ type: 'text', content: '' }];
    const parts = [];
    let currentIndex = 0;
    const markdownRegex = /(\*\*.*?\*\*|\[.*?\]\(.*?\)|\((https?:\/\/[^\s)]+)\)|####.*?(?=\n|$)|###.*?(?=\n|$)|##.*?(?=\n|$)|#.*?(?=\n|$))/g;

    let match;
    while ((match = markdownRegex.exec(text)) !== null) {
      if (match.index > currentIndex) {
        parts.push({ type: 'text', content: text.slice(currentIndex, match.index) });
      }
      const matchedText = match[1];
      if (matchedText.startsWith('**') && matchedText.endsWith('**')) {
        parts.push({ type: 'bold', content: matchedText.slice(2, -2) });
      } else if (matchedText.startsWith('[') && matchedText.includes('](')) {
        const label = matchedText.match(/\[(.*?)\]/)?.[1];
        if (label) parts.push({ type: 'bold', content: label });
      } else if (matchedText.startsWith('(') && matchedText.endsWith(')')) {
        const url = matchedText.slice(1, -1);
        parts.push({ type: 'bold', content: url });
      } else if (matchedText.startsWith('####')) {
        parts.push({ type: 'h4', content: matchedText.slice(4).trim() });
      } else if (matchedText.startsWith('###')) {
        parts.push({ type: 'h3', content: matchedText.slice(3).trim() });
      } else if (matchedText.startsWith('##')) {
        parts.push({ type: 'h2', content: matchedText.slice(2).trim() });
      } else if (matchedText.startsWith('#')) {
        parts.push({ type: 'h1', content: matchedText.slice(1).trim() });
      }
      currentIndex = match.index + match[0].length;
    }

    if (currentIndex < text.length) {
      parts.push({ type: 'text', content: text.slice(currentIndex) });
    }
    return parts.length > 0 ? parts : [{ type: 'text', content: text }];
  };

  const parseCodeBlocks = (text) => {
    if (!text) return [{ type: 'text', content: '' }];
    const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        const textPart = text.slice(lastIndex, match.index);
        const markdownParts = parseMarkdown(textPart);
        parts.push(...markdownParts);
      }
      parts.push({ type: 'code', language: match[1] || 'code', content: match[2].trim() });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      const textPart = text.slice(lastIndex);
      const markdownParts = parseMarkdown(textPart);
      parts.push(...markdownParts);
    }
    return parts.length > 0 ? parts : parseMarkdown(text);
  };
  
  const BlinkingDots = () => {
    const [dotIndex, setDotIndex] = useState(0);

    useEffect(() => {
      const interval = setInterval(() => {
        setDotIndex((prev) => (prev + 1) % 4);
      }, 500);
      return () => clearInterval(interval);
    }, []);

    return (
      <View style={styles.dotsContainer}>
        <Text style={[styles.dot, dotIndex >= 1 && styles.dotVisible]}>.</Text>
        <Text style={[styles.dot, dotIndex >= 2 && styles.dotVisible]}>.</Text>
        <Text style={[styles.dot, dotIndex >= 3 && styles.dotVisible]}>.</Text>
      </View>
    );
  };

  const renderMessageContent = (message) => {
    if (!message.isUser && message.isStreaming && (!message.text || message.text.length === 0)) {
      return <BlinkingDots />;
    }

    const parts = parseCodeBlocks(message.text);
    const codeId = `${message.id}-${Date.now()}`;
    
    return (
      <View>
        {parts.map((part, index) => {
          if (part.type === 'code') {
            const isCopied = copiedCodeId === `${codeId}-${index}`;
            return (
              <View key={index} style={[styles.codeContainer, { backgroundColor: colors.codeBackground, borderColor: colors.border }]}>
                <View style={[styles.codeHeader, { backgroundColor: colors.codeHeader, borderBottomColor: colors.border }]}>
                  <Text style={[styles.codeLanguage, { color: colors.textSecondary }]}>{part.language}</Text>
                  <TouchableOpacity
                    style={[styles.copyButton, { backgroundColor: isCopied ? colors.userBubble + '15' : 'transparent' }]}
                    onPress={() => copyToClipboard(part.content, `${codeId}-${index}`)}
                  >
                    <Ionicons 
                      name={isCopied ? "checkmark-outline" : "copy-outline"} 
                      size={16} 
                      color={isCopied ? colors.userBubble : colors.textSecondary} 
                    />
                    <Text style={[styles.copyButtonText, { color: isCopied ? colors.userBubble : colors.textSecondary }]}>
                      {isCopied ? 'Copied' : 'Copy'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <Text style={[styles.codeText, { color: colors.codeText }]}>{part.content}</Text>
                </ScrollView>
              </View>
            );
          } else if (part.type === 'bold') {
            return (
              <Text key={index} style={[styles.messageText, styles.boldText, { 
                color: message.isUser ? '#FFFFFF' : colors.boldText, fontWeight: '700'
              }]}>
                {part.content}
              </Text>
            );
          } else if (part.type.startsWith('h')) {
            const headerLevel = parseInt(part.type.charAt(1));
            return (
              <Text key={index} style={[styles.messageText, styles.headerText, { 
                color: message.isUser ? '#FFFFFF' : colors.highlight,
                fontSize: 20 - (headerLevel * 2), fontWeight: '700', marginVertical: 8,
              }]}>
                {part.content}
              </Text>
            );
          } else {
            return (
              <Text key={index} style={[styles.messageText, { 
                color: message.isUser ? '#FFFFFF' : colors.text 
              }]}>
                {part.content}
              </Text>
            );
          }
        })}
      </View>
    );
  };

  const stopStreaming = () => {
    if (streamAbortController.current && isStreaming) {
      streamAbortController.current.abort();
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    let newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputText('');
    setIsLoading(true);
    setIsStreaming(true);
    animateSendButton();

    const aiMessage = {
      id: (Date.now() + 1).toString(),
      text: '',
      isUser: false,
      timestamp: new Date(),
      isStreaming: true,
    };

    const messagesWithAI = [...newMessages, aiMessage];
    setMessages(messagesWithAI);

    streamAbortController.current = new AbortController();

    try {
      setIsLoading(false);

      const response = await expoFetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          model: selectedModel.value,
          messages: [{ role: "user", content: userMessage.text }],
          stream: true,
        }),
        signal: streamAbortController.current.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const decoder = new TextDecoder();
      let fullResponse = '';

      while (true) {
        if (streamAbortController.current?.signal.aborted) {
          setIsStreaming(false);
          const stoppedMessages = messagesWithAI.map(msg => 
            msg.id === aiMessage.id 
              ? { ...msg, text: fullResponse || 'Response stopped.', isStreaming: false }
              : msg
          );
          setMessages(stoppedMessages);
          
          if (messages.length === 0 && !currentSessionId) {
            const sessionId = await createNewChatSession(userMessage, { 
              ...aiMessage, 
              text: fullResponse || 'Response stopped.', 
              isStreaming: false 
            });
            setCurrentSessionId(sessionId);
          } else {
            await updateCurrentSession(stoppedMessages);
          }
          return;
        }

        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              
              if (content) {
                fullResponse += content;
                
                setMessages(prevMessages => 
                  prevMessages.map(msg => 
                    msg.id === aiMessage.id 
                      ? { ...msg, text: fullResponse }
                      : msg
                  )
                );

                setTimeout(() => {
                  flatListRef.current?.scrollToEnd({ animated: true });
                }, 50);
              }
            } catch (e) {
              continue;
            }
          }
        }
      }

      const finalMessages = messagesWithAI.map(msg => 
        msg.id === aiMessage.id 
          ? { ...msg, text: fullResponse, isStreaming: false }
          : msg
      );
      
      setMessages(finalMessages);
      setIsStreaming(false);
      
      if (messages.length === 0 && !currentSessionId) {
        const sessionId = await createNewChatSession(userMessage, { ...aiMessage, text: fullResponse, isStreaming: false });
        setCurrentSessionId(sessionId);
      } else {
        await updateCurrentSession(finalMessages);
      }

    } catch (error) {
      console.error('Error with streaming response:', error);
      setIsLoading(false);
      setIsStreaming(false);
      
      if (!streamAbortController.current?.signal.aborted) {
        const errorMessage = {
          id: (Date.now() + 1).toString(),
          text: 'Sorry, This Model is Currently Unavailable, Try Again After 24 Hours.',
          timestamp: new Date(),
          isUser: false,
          isStreaming: false,
        };
        
        const finalMessages = [...newMessages, errorMessage];
        setMessages(finalMessages);

        if (messages.length === 0 && !currentSessionId) {
          const sessionId = await createNewChatSession(userMessage, errorMessage);
          setCurrentSessionId(sessionId);
        } else {
          await updateCurrentSession(finalMessages);
        }
      }
      
      streamAbortController.current = null;
    }
  };

  const renderMessage = ({ item }) => {
    const isUser = item.isUser;

    return (
      <View style={[
        styles.messageContainer,
        isUser ? styles.userMessageContainer : styles.aiMessageContainer
      ]}>
        <View style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.aiBubble
        ]}>
          {!isUser && (
            <View style={styles.aiAvatarContainer}>
              <View style={[styles.aiAvatar, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                {selectedModel.icon({ size: 18, color: selectedModel.color })}
              </View>
            </View>
          )}
          
          <View style={[
            styles.messageContent,
            { backgroundColor: isUser ? colors.userBubble : colors.aiBubble }
          ]}>
            {renderMessageContent(item)}
          </View>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyAvatar, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
        <LinearGradient
          colors={['#2563EB', '#3B82F6', '#60A5FA']}
          style={styles.emptyAvatarGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="sparkles" size={28} color="#fff" />
        </LinearGradient>
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>Raze 4o</Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        Choose your preferred AI model and start chatting with real-time streaming
      </Text>
    </View>
  );

  const renderChatSession = ({ item }) => (
    <TouchableOpacity 
      style={[styles.chatSessionItem, { borderBottomColor: colors.border }]}
      onPress={() => loadChatSession(item)}
      activeOpacity={0.7}
    >
      <View style={styles.chatSessionContent}>
        <Text style={[styles.chatSessionName, { color: colors.text }]} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={[styles.chatSessionDate, { color: colors.textTertiary }]}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
    </TouchableOpacity>
  );

  const ThemeOption = ({ title, value, currentValue, onPress }) => {
    const isClearAll = value === "clearall";

    return (
      <TouchableOpacity
        style={[
          styles.themeOption,
          { borderBottomColor: colors.border },
          isClearAll && { backgroundColor: "transparent" },
        ]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.themeOptionText,
            { color: isClearAll ? "red" : colors.text },
          ]}
        >
          {title}
        </Text>

        {!isClearAll && value === currentValue && (
          <View style={[styles.checkmark, { backgroundColor: colors.userBubble }]}>
            <Ionicons name="checkmark" size={16} color="#fff" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const rotateArrow = dropdownRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} {...panResponder.panHandlers}>
      <StatusBar 
        barStyle={currentTheme === 'dark' ? 'light-content' : 'dark-content'} 
        backgroundColor={colors.background} 
      />
      
      <View style={[styles.header, { 
        backgroundColor: colors.background, 
        borderBottomColor: colors.borderLight,
        paddingTop: Platform.OS === 'ios' ? 0 : 20,
      }]}>
        <TouchableOpacity 
          style={[styles.hamburgerButton, { backgroundColor: colors.surface }]}
          onPress={toggleSidebar}
          activeOpacity={0.7}
        >
          <View style={[styles.hamburgerLine, { backgroundColor: colors.textSecondary }]} />
          <View style={[styles.hamburgerLine, { backgroundColor: colors.textSecondary }]} />
          <View style={[styles.hamburgerLine, { backgroundColor: colors.textSecondary }]} />
        </TouchableOpacity>

        <View style={styles.modelSelectorContainer}>
          <TouchableOpacity 
            style={[styles.modelSelector, { 
              backgroundColor: colors.surfaceElevated, 
              borderColor: colors.border,
              shadowColor: colors.shadow,
            }]}
            onPress={toggleModelDropdown}
            activeOpacity={0.8}
          >
            <View style={styles.modelIconContainer}>
              {selectedModel.icon({ size: 20, color: selectedModel.color })}
            </View>
            <Text style={[styles.modelName, { color: colors.text }]}>{selectedModel.name}</Text>
            <Animated.View style={{ transform: [{ rotate: rotateArrow }] }}>
              <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
            </Animated.View>
          </TouchableOpacity>

          {showModelDropdown && (
            <Animated.View 
              style={[
                styles.modelDropdown,
                { 
                  backgroundColor: colors.dropdown,
                  borderColor: colors.dropdownBorder,
                  shadowColor: colors.shadow,
                  opacity: dropdownOpacity,
                  transform: [
                    {
                      translateY: dropdownAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-10, 0],
                      })
                    },
                    {
                      scale: dropdownAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.95, 1],
                      })
                    }
                  ],
                }
              ]}
            >
              {AI_MODELS.map((model, index) => (
                <TouchableOpacity
                  key={model.id}
                  style={[
                    styles.modelOption,
                    index < AI_MODELS.length - 1 && { borderBottomColor: colors.dropdownBorder, borderBottomWidth: 0.5 },
                    selectedModel.id === model.id && { backgroundColor: colors.userBubble + '10' }
                  ]}
                  onPress={() => selectModel(model)}
                  activeOpacity={0.7}
                >
                  <View style={styles.modelOptionIconContainer}>
                    {model.icon({ size: 18, color: model.color })}
                  </View>
                  <Text style={[styles.modelOptionName, { color: colors.text }]}>{model.name}</Text>
                  {selectedModel.id === model.id && (
                    <View style={[styles.selectedIndicator, { backgroundColor: colors.userBubble }]}>
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </Animated.View>
          )}
        </View>

        <TouchableOpacity 
          style={[styles.settingsButton, { backgroundColor: colors.surface }]}
          onPress={() => setShowSettings(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="settings-outline" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.chatContainer}>
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.messagesList,
            messages.length === 0 && styles.emptyMessagesList,
            { paddingBottom: keyboardHeight > 0 ? keyboardHeight + 80 : 20 }
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyState}
          onContentSizeChange={() => {
            if (isKeyboardVisible || messages.length > 0) {
              flatListRef.current?.scrollToEnd({ animated: true });
            }
          }}
        />
      </View>

      <Animated.View 
        style={[
          styles.inputContainer, 
          { 
            backgroundColor: colors.background, 
            borderTopColor: colors.borderLight,
            paddingBottom: keyboardHeight > 0 ? keyboardHeight + 10 : (insets.bottom > 0 ? insets.bottom : 20),
            transform: [{
              translateY: inputContainerAnim.interpolate({
                inputRange: [0, 300],
                outputRange: [0, -10],
              })
            }]
          }
        ]}
      >
        <View style={[styles.inputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TextInput
            style={[styles.textInput, { color: colors.text }]}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type your message..."
            placeholderTextColor={colors.textTertiary}
            multiline
            maxLength={2000}
            autoFocus={false}
            editable={!isStreaming}
          />
          <Animated.View style={{ transform: [{ scale: sendButtonScale }] }}>
            <TouchableOpacity
              style={[
                styles.sendButton,
                { 
                  backgroundColor: isStreaming ? '#DC2626' : colors.userBubble
                },
                (!inputText.trim() && !isStreaming) && { opacity: 0.4 }
              ]}
              onPress={isStreaming ? stopStreaming : sendMessage}
              disabled={!inputText.trim() && !isStreaming}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : isStreaming ? (
                <StopIcon size={16} color="#fff" />
              ) : (
                <Ionicons 
                  name="arrow-up" 
                  size={20} 
                  color="#fff" 
                />
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>
        
        {/* @Nactire */}
        {isStreaming && (
          <View style={styles.streamingStatus}>
            <View style={styles.streamingIndicator}>
              <Animated.View 
                style={[
                  styles.streamingDot, 
                  { 
                    backgroundColor: '#DC2626',
                    transform: [{ scale: pulseAnim }]
                  }
                ]} 
              />
              <Text style={[styles.streamingText, { color: colors.textSecondary }]}>
                Raze Streaming... Tap stop to cancel
              </Text>
            </View>
          </View>
        )}
      </Animated.View>

      {showSidebar && (
        <>
          <Animated.View 
            style={[
              styles.sidebarOverlay, 
              { 
                backgroundColor: colors.overlay,
                opacity: overlayOpacity,
                paddingTop: insets.top,
                paddingBottom: insets.bottom,
              }
            ]}
          >
            <TouchableOpacity 
              style={{ flex: 1 }}
              onPress={toggleSidebar}
              activeOpacity={1}
            />
          </Animated.View>

          <Animated.View 
            style={[
              styles.sidebar,
              { 
                backgroundColor: colors.sidebarBackground,
                transform: [{ translateX: sidebarAnimation }],
                paddingTop: insets.top,
                paddingBottom: insets.bottom,
              }
            ]}
          >
            <View style={[styles.sidebarHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.sidebarTitle, { color: colors.text }]}>Raze 4o</Text>
            </View>

            <TouchableOpacity 
              style={[styles.newChatButton, { backgroundColor: colors.newChatButtonBg }]}
              onPress={startNewChat}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={20} color={colors.newChatButtonText} />
              <Text style={[styles.newChatText, { color: colors.newChatButtonText }]}>
                𝗡𝗲𝘄 𝗖𝗵𝗮𝘁
              </Text>
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.chatHistoryContainer}>
              <Text style={[styles.historyTitle, { color: colors.textSecondary }]}>History</Text>
              
              {chatSessions.length === 0 ? (
                <View style={styles.emptyHistoryContainer}>
                  <Text style={[styles.emptyHistoryText, { color: colors.textTertiary }]}>
                    You haven't chatted yet.
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={chatSessions}
                  renderItem={renderChatSession}
                  keyExtractor={(item) => item.id}
                  showsVerticalScrollIndicator={false}
                  style={styles.chatHistoryList}
                />
              )}
            </View>
          </Animated.View>
        </>
      )}

      <Modal
        visible={showSettings}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSettings(false)}
      >
        <TouchableOpacity 
          style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}
          activeOpacity={1}
          onPress={() => setShowSettings(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.surfaceElevated, shadowColor: colors.shadow }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Settings</Text>
            
            <View style={styles.settingsSection}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Appearance</Text>
              
              <ThemeOption 
                title="Dark Mode" 
                value="dark" 
                currentValue={theme}
                onPress={() => saveTheme('dark')}
              />
              
              <ThemeOption 
                title="Light Mode" 
                value="light" 
                currentValue={theme}
                onPress={() => saveTheme('light')}
              />
              
              <ThemeOption
                title="Clear Data"
                value="clearall"
                currentValue={theme}
                onPress={confirmAndClear}
             />
           </View>

            <TouchableOpacity 
              style={[styles.closeButton, { backgroundColor: colors.userBubble }]}
              onPress={() => setShowSettings(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.closeButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {showModelDropdown && (
        <TouchableOpacity 
          style={styles.dropdownOverlay}
          activeOpacity={1}
          onPress={() => setShowModelDropdown(false)}
        />
      )}
    </SafeAreaView>
  );
}

export default function AppWrapper() {
  return (
    <SafeAreaProvider>
      <App />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 0.5,
    zIndex: 1000,
  },
  hamburgerButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    borderRadius: 12,
    marginRight: 12,
  },
  hamburgerLine: {
    width: 18,
    height: 2,
    borderRadius: 1,
    marginVertical: 2,
  },
  modelSelectorContainer: {
    flex: 1,
    position: 'relative',
  },
  modelSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    maxWidth: 200,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  modelIconContainer: {
    marginRight: 10,
  },
  modelName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    letterSpacing: -0.2,
  },
  modelDropdown: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    maxWidth: 240,
    borderRadius: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
    zIndex: 1001,
    overflow: 'hidden',
  },
  modelOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  modelOptionIconContainer: {
    marginRight: 12,
  },
  modelOptionName: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
    letterSpacing: -0.1,
  },
  selectedIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  settingsButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  sidebarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1998,
  },
  sidebar: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: width * 0.8,
    zIndex: 1999,
  },
  sidebarHeader: {
    paddingHorizontal: 24,
    paddingVertical: 24,
    borderBottomWidth: 1,
  },
  sidebarTitle: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  newChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 20,
    paddingVertical: 16,
    borderRadius: 12,
  },
  newChatText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    letterSpacing: -0.1,
  },
  divider: {
    height: 1,
    marginHorizontal: 20,
    marginTop: 20,
  },
  chatHistoryContainer: {
    flex: 1,
    paddingTop: 20,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  emptyHistoryContainer: {
    paddingHorizontal: 24,
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyHistoryText: {
    fontSize: 16,
    textAlign: 'center',
    letterSpacing: -0.1,
  },
  chatHistoryList: {
    flex: 1,
  },
  chatSessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
  },
  chatSessionContent: {
    flex: 1,
  },
  chatSessionName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
    letterSpacing: -0.1,
  },
  chatSessionDate: {
    fontSize: 13,
    letterSpacing: -0.1,
  },
  chatContainer: {
    flex: 1,
  },
  messagesList: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  emptyMessagesList: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 80,
  },
  emptyAvatar: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  emptyAvatarGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    letterSpacing: -0.2,
  },
  messageContainer: {
    marginVertical: 8,
  },
  userMessageContainer: {
    alignItems: 'flex-end',
  },
  aiMessageContainer: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: width * 0.85,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 2,
  },
  userBubble: {
    flexDirection: 'row-reverse',
  },
  aiBubble: {
    flexDirection: 'row',
  },
  aiAvatarContainer: {
    marginRight: 12,
    marginTop: 4,
  },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  messageContent: {
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 18,
    maxWidth: width * 0.75,
    position: 'relative',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: -0.1,
  },
  boldText: {
    fontWeight: '700',
  },
  headerText: {
    fontWeight: '700',
    marginVertical: 8,
  },
  streamingCursor: {
    fontSize: 16,
    fontWeight: '300',
    marginLeft: 2,
  },
  codeContainer: {
    borderRadius: 12,
    marginVertical: 8,
    overflow: 'hidden',
    borderWidth: 1,
  },
  codeHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  codeLanguage: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  copyButtonText: {
    fontSize: 12,
    marginLeft: 6,
    fontWeight: '500',
    letterSpacing: -0.1,
  },
  codeText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    padding: 16,
    lineHeight: 20,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 4,
    minHeight: 24,
  },
  dot: {
    fontSize: 20,
    color: 'transparent',
    marginHorizontal: 1,
    fontWeight: 'bold',
    lineHeight: 20,
  },
  dotVisible: {
    color: '#888',
  },
  inputContainer: {
    borderTopWidth: 0.5,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderWidth: 1,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    maxHeight: 120,
    paddingVertical: 8,
    paddingRight: 12,
    letterSpacing: -0.1,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  streamingStatus: {
    paddingTop: 8,
    alignItems: 'center',
  },
  streamingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
  },
  streamingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  streamingText: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: -0.1,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    padding: 24,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 24,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  settingsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  themeOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 0.5,
  },
  themeOptionText: {
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: -0.1,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
});