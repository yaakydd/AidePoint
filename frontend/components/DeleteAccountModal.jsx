import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity } from 'react-native';

export default function DeleteAccountModal({ visible, onCancel, onConfirm }) {
  const [text, setText] = useState('');
  const confirmed = text.trim().toUpperCase() === 'DELETE';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Are you absolutely sure?</Text>
          <Text style={styles.body}>
            This permanently erases your account and all associated data. This cannot be undone.
          </Text>
          <Text style={styles.label}>Type DELETE to confirm.</Text>
          <TextInput
            value={text}
            onChangeText={setText}
            autoCapitalize="characters"
            placeholder="DELETE"
            style={styles.input}
          />
          <View style={styles.actions}>
            <TouchableOpacity onPress={() => { setText(''); onCancel(); }}>
              <Text style={styles.cancel}>CANCEL</Text>
            </TouchableOpacity>
            <TouchableOpacity disabled={!confirmed} onPress={() => { setText(''); onConfirm(); }}>
              <Text style={[styles.delete, !confirmed && styles.disabled]}>DELETE MY ACCOUNT</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
