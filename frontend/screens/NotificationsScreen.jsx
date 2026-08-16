import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList,
  StatusBar, RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabase';
import { styles } from '../styles/NotificationStyles';
import Header from '../components/Header';
import { HEADER } from '../assets/theme';


function iconFor(title = '') {
  const t = title.toLowerCase();
  if (t.includes('password'))  return { name: 'lock-outline', color: '#0EA5E9', bg: '#F0F9FF' };
  if (t.includes('scan'))      return { name: 'microscope',   color: '#22C55E', bg: '#F0FDF4' };
  if (t.includes('subscri') || t.includes('plan')) return { name: 'crown-outline', color: '#7C3AED', bg: '#F5F3FF' };
  return { name: 'bell-outline', color: '#F97316', bg: '#FFF7ED' };
}

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)     return 'Just now';
  if (diff < 3600)   return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString([], { day: 'numeric', month: 'short' });
}

export default function NotificationsScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) { setLoading(false); return; }

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error) setNotifications(data ?? []);
    setLoading(false);
    setRefreshing(false);
  }, [user?.id]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  function onRefresh() {
    setRefreshing(true);
    fetchNotifications();
  }

  async function markAsRead(item) {
    if (item.read) return;
    // optimistic — flip it locally first, don't make them wait on the round trip
    setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, read: true } : n));
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', item.id);
    if (error) {
      // put it back if the update actually failed
      setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, read: false } : n));
    }
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  async function markAllRead() {
    if (unreadCount === 0) return;
    const ids = notifications.filter(n => !n.read).map(n => n.id);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    await supabase.from('notifications').update({ read: true }).in('id', ids);
  }

  function renderItem({ item }) {
    const icon = iconFor(item.title);
    return (
      <TouchableOpacity
        style={[styles.row, !item.read && styles.rowUnread]}
        activeOpacity={0.7}
        onPress={() => markAsRead(item)}
      >
        <View style={[styles.iconBox, { backgroundColor: icon.bg }]}>
          <MaterialCommunityIcons name={icon.name} size={19} color={icon.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.body} numberOfLines={2}>{item.body}</Text>
          <Text style={styles.time}>{timeAgo(item.created_at)}</Text>
        </View>
        {!item.read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <Header
        left={
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={HEADER.iconSize} color="#1F2937" />
          </TouchableOpacity>
        }
        center={<Text style={styles.headerTitle}>Notifications</Text>}
        right={
          unreadCount > 0 ? (
            <TouchableOpacity onPress={markAllRead} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.markAllText}>Mark all read</Text>
            </TouchableOpacity>
          ) : null
        }
      />

      {loading ? (
        <View style={styles.centerFill}>
          <ActivityIndicator color="#0EA5E9" />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.centerFill}>
          <MaterialCommunityIcons name="bell-off-outline" size={40} color="#CBD5E1" />
          <Text style={styles.emptyText}>Nothing here yet</Text>
          <Text style={styles.emptySub}>You'll see scan results and account alerts here.</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0EA5E9" />
          }
        />
      )}
    </SafeAreaView>
  );
}