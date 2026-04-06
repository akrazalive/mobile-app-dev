import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Image,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';

export default function PrincipalDashboard({ navigation }) {
  const [activeTab, setActiveTab] = useState('students');
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [imageUri, setImageUri] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    class: '',
    section: '',
    rollNo: '',
    address: '',
   // parentPhone: '',
    subject: '',
    qualification: '',
  });

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'students') {
        const { data } = await supabase.from('students').select('*');
        if (data) setStudents(data);
      } else if (activeTab === 'teachers') {
        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('role', 'teacher');
        if (data) setTeachers(data);
      } else if (activeTab === 'classes') {
        const { data } = await supabase.from('classes').select('*');
        if (data) setClasses(data);
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant permission to access photos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const uploadImage = async (userId) => {
    if (!imageUri) return null;
    
    const fileName = `${userId}_${Date.now()}.jpg`;
    const formData = new FormData();
    formData.append('file', {
      uri: imageUri,
      type: 'image/jpeg',
      name: fileName,
    });

    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(fileName, formData);

    if (error) {
      console.error('Upload error:', error);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleAdd = async () => {
    if (!formData.name || !formData.email) {
      Alert.alert('Error', 'Name and Email are required');
      return;
    }

    setLoading(true);
    try {
      let avatarUrl = null;
      
      if (activeTab === 'students') {
        // Add student
        const { data, error } = await supabase
          .from('students')
          .insert([{
            ...formData,
            avatar_url: avatarUrl,
            created_at: new Date(),
          }])
          .select();

        if (error) throw error;
        
        // Create auth user for student
        const { error: authError } = await supabase.auth.admin.createUser({
          email: formData.email,
          password: 'password123',
          email_confirm: true,
          user_metadata: { name: formData.name, role: 'student' },
        });

        if (authError) console.log('Auth error:', authError);
        
        Alert.alert('Success', 'Student added successfully');
      } 
      else if (activeTab === 'teachers') {
        // Add teacher
        const { data, error } = await supabase
          .from('users')
          .insert([{
            ...formData,
            role: 'teacher',
            avatar_url: avatarUrl,
            created_at: new Date(),
          }])
          .select();

        if (error) throw error;
        
        // Create auth user for teacher
        const { error: authError } = await supabase.auth.admin.createUser({
          email: formData.email,
          password: 'password123',
          email_confirm: true,
          user_metadata: { name: formData.name, role: 'teacher' },
        });

        Alert.alert('Success', 'Teacher added successfully');
      }
      else if (activeTab === 'classes') {
        // Add class
        const { error } = await supabase
          .from('classes')
          .insert([{
            class_name: formData.name,
            section: formData.section,
            teacher_id: formData.teacherId,
            room_number: formData.roomNo,
            created_at: new Date(),
          }]);

        if (error) throw error;
        Alert.alert('Success', 'Class added successfully');
      }

      setModalVisible(false);
      resetForm();
      loadData();
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              if (activeTab === 'students') {
                await supabase.from('students').delete().eq('id', id);
              } else if (activeTab === 'teachers') {
                await supabase.from('users').delete().eq('id', id);
              } else if (activeTab === 'classes') {
                await supabase.from('classes').delete().eq('id', id);
              }
              Alert.alert('Success', 'Deleted successfully');
              loadData();
            } catch (error) {
              Alert.alert('Error', error.message);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      class: '',
      section: '',
      rollNo: '',
      address: '',
      //parentPhone: '',
      subject: '',
      qualification: '',
      teacherId: '',
      roomNo: '',
    });
    setImageUri(null);
    setEditingItem(null);
  };

  const renderForm = () => {
    if (activeTab === 'students') {
      return (
        <>
          <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.previewImage} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Text style={styles.imagePlaceholderText}>📸 Tap to add photo</Text>
              </View>
            )}
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder="Full Name *"
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
          />
          <TextInput
            style={styles.input}
            placeholder="Email *"
            value={formData.email}
            onChangeText={(text) => setFormData({ ...formData, email: text })}
            keyboardType="email-address"
          />
          <TextInput
            style={styles.input}
            placeholder="Phone"
            value={formData.phone}
            onChangeText={(text) => setFormData({ ...formData, phone: text })}
            keyboardType="phone-pad"
          />
          <TextInput
            style={styles.input}
            placeholder="Class (e.g., 10)"
            value={formData.class}
            onChangeText={(text) => setFormData({ ...formData, class: text })}
          />
          <TextInput
            style={styles.input}
            placeholder="Section (e.g., A)"
            value={formData.section}
            onChangeText={(text) => setFormData({ ...formData, section: text })}
          />
          <TextInput
            style={styles.input}
            placeholder="Roll Number"
            value={formData.rollNo}
            onChangeText={(text) => setFormData({ ...formData, rollNo: text })}
          />
          <TextInput
            style={styles.input}
            placeholder="Address"
            value={formData.address}
            onChangeText={(text) => setFormData({ ...formData, address: text })}
            multiline
          />
         
        </>
      );
    } else if (activeTab === 'teachers') {
      return (
        <>
          <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.previewImage} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Text style={styles.imagePlaceholderText}>📸 Tap to add photo</Text>
              </View>
            )}
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder="Full Name *"
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
          />
          <TextInput
            style={styles.input}
            placeholder="Email *"
            value={formData.email}
            onChangeText={(text) => setFormData({ ...formData, email: text })}
            keyboardType="email-address"
          />
          <TextInput
            style={styles.input}
            placeholder="Phone"
            value={formData.phone}
            onChangeText={(text) => setFormData({ ...formData, phone: text })}
            keyboardType="phone-pad"
          />
          <TextInput
            style={styles.input}
            placeholder="Subject (e.g., Mathematics)"
            value={formData.subject}
            onChangeText={(text) => setFormData({ ...formData, subject: text })}
          />
          <TextInput
            style={styles.input}
            placeholder="Qualification"
            value={formData.qualification}
            onChangeText={(text) => setFormData({ ...formData, qualification: text })}
          />
          <TextInput
            style={styles.input}
            placeholder="Assigned Class (e.g., 10A)"
            value={formData.class}
            onChangeText={(text) => setFormData({ ...formData, class: text })}
          />
        </>
      );
    } else if (activeTab === 'classes') {
      return (
        <>
          <TextInput
            style={styles.input}
            placeholder="Class Name (e.g., Grade 10) *"
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
          />
          <TextInput
            style={styles.input}
            placeholder="Section (e.g., A) *"
            value={formData.section}
            onChangeText={(text) => setFormData({ ...formData, section: text })}
          />
          <TextInput
            style={styles.input}
            placeholder="Teacher ID"
            value={formData.teacherId}
            onChangeText={(text) => setFormData({ ...formData, teacherId: text })}
          />
          <TextInput
            style={styles.input}
            placeholder="Room Number"
            value={formData.roomNo}
            onChangeText={(text) => setFormData({ ...formData, roomNo: text })}
          />
        </>
      );
    }
    return null;
  };

  const renderCard = (item) => {
    if (activeTab === 'students') {
      return (
        <View key={item.id} style={styles.card}>
          <Image
            source={{ uri: item.avatar_url || 'https://via.placeholder.com/60' }}
            style={styles.avatar}
            defaultSource={require('../assets/logo.jpg')}
          />
          <View style={styles.cardContent}>
            <Text style={styles.cardName}>{item.name}</Text>
            <Text style={styles.cardDetail}>📧 {item.email}</Text>
            <Text style={styles.cardDetail}>📚 Class {item.class}-{item.section}</Text>
            <Text style={styles.cardDetail}>🎯 Roll No: {item.rollNo}</Text>
          </View>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDelete(item.id)}>
            <Text style={styles.deleteText}>🗑️</Text>
          </TouchableOpacity>
        </View>
      );
    } else if (activeTab === 'teachers') {
      return (
        <View key={item.id} style={styles.card}>
          <Image
            source={{ uri: item.avatar_url || 'https://via.placeholder.com/60' }}
            style={styles.avatar}
            defaultSource={require('../assets/logo.jpg')}
          />
          <View style={styles.cardContent}>
            <Text style={styles.cardName}>{item.name}</Text>
            <Text style={styles.cardDetail}>📧 {item.email}</Text>
            <Text style={styles.cardDetail}>📖 {item.subject || 'Not assigned'}</Text>
            <Text style={styles.cardDetail}>🏫 Class: {item.class || 'Not assigned'}</Text>
          </View>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDelete(item.id)}>
            <Text style={styles.deleteText}>🗑️</Text>
          </TouchableOpacity>
        </View>
      );
    } else if (activeTab === 'classes') {
      return (
        <View key={item.id} style={styles.card}>
          <View style={styles.classIcon}>
            <Text style={styles.classIconText}>🏫</Text>
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardName}>{item.class_name}</Text>
            <Text style={styles.cardDetail}>📌 Section: {item.section}</Text>
            <Text style={styles.cardDetail}>👨‍🏫 Teacher ID: {item.teacher_id || 'Not assigned'}</Text>
            <Text style={styles.cardDetail}>🚪 Room: {item.room_number || 'Not assigned'}</Text>
          </View>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDelete(item.id)}>
            <Text style={styles.deleteText}>🗑️</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return null;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Principal Dashboard</Text>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={async () => {
            await supabase.auth.signOut();
            navigation.replace('RoleSelection');
          }}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabBar}>
        {['students', 'teachers', 'classes'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}>
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => {
          resetForm();
          setModalVisible(true);
        }}>
        <Text style={styles.addButtonText}>+ Add New</Text>
      </TouchableOpacity>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        {loading ? (
          <ActivityIndicator size="large" color="#3498db" style={styles.loader} />
        ) : (
          <>
            {activeTab === 'students' && students.map(renderCard)}
            {activeTab === 'teachers' && teachers.map(renderCard)}
            {activeTab === 'classes' && classes.map(renderCard)}
            {activeTab === 'students' && students.length === 0 && (
              <Text style={styles.emptyText}>No students added yet</Text>
            )}
            {activeTab === 'teachers' && teachers.length === 0 && (
              <Text style={styles.emptyText}>No teachers added yet</Text>
            )}
            {activeTab === 'classes' && classes.length === 0 && (
              <Text style={styles.emptyText}>No classes created yet</Text>
            )}
          </>
        )}
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Add New {activeTab.slice(0, -1)}
            </Text>
            {renderForm()}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleAdd}>
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2c3e50',
    padding: 20,
    paddingTop: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  logoutButton: {
    backgroundColor: '#e74c3c',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  logoutText: {
    color: '#fff',
    fontWeight: '600',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: '#3498db',
  },
  tabText: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  activeTabText: {
    color: '#3498db',
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: '#3498db',
    margin: 16,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
  },
  classIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  classIconText: {
    fontSize: 30,
  },
  cardContent: {
    flex: 1,
  },
  cardName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  cardDetail: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 2,
  },
  deleteButton: {
    padding: 8,
  },
  deleteText: {
    fontSize: 20,
  },
  loader: {
    marginTop: 50,
  },
  emptyText: {
    textAlign: 'center',
    color: '#7f8c8d',
    marginTop: 50,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#2c3e50',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  imagePicker: {
    alignItems: 'center',
    marginBottom: 16,
  },
  imagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#ecf0f1',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  imagePlaceholderText: {
    color: '#7f8c8d',
    fontSize: 12,
    textAlign: 'center',
  },
  previewImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#ecf0f1',
  },
  saveButton: {
    backgroundColor: '#3498db',
  },
  cancelButtonText: {
    color: '#7f8c8d',
    fontWeight: '600',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});