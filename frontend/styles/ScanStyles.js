const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F8F8' },
  scroll: { padding: 20 },

  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backButton: { padding: 10 },

  headerCenter: { flexDirection: 'row', alignItems: 'center' },
  logo: {
    backgroundColor: '#0bc9da',
    padding: 6,
    borderRadius: 8,
    marginRight: 6
  },
  title: { fontSize: 20, fontWeight: '700' },

  scanBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#E5E7EB',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  scanLabel: { color: '#6B7280' },
  scanId: { color: '#0bc9da', fontWeight: 'bold' },

  input: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    marginBottom: 12,
  },

  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },

  cameraButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0bc9da',
    padding: 16,
    borderRadius: 12,
    gap: 10,
  },

  cameraText: {
    color: '#0bc9da',
    fontWeight: '700',
  },

  previewBox: {
    marginTop: 15,
    alignItems: 'center',
  },

  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },

  previewText: {
    marginTop: 8,
    color: '#6B7280',
  },

  button: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0bc9da',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },

  disabledButton: {
    backgroundColor: '#9CA3AF',
  },

  buttonText: {
    color: '#fff',
    fontWeight: '700',
  },
});