import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Button, Modal, message, Spin, List, Divider, Table, Tag } from 'antd';
import { ArrowLeftOutlined, QrcodeOutlined } from '@ant-design/icons';
import Webcam from 'react-webcam';
import { sendFaceAttendance, fetchClassStudents, fetchSessionAttendance } from '../api/faceAttendance';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';

const FaceAttendance = () => {
  const webcamRef = useRef(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recognizedStudents, setRecognizedStudents] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [studentsData, setStudentsData] = useState([]);
  const [sessionStatus, setSessionStatus] = useState('');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);

  const classId = searchParams.get('classId');
  const sessionDate = searchParams.get('sessionDate');
  const intervalRef = useRef(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      message.error('Bạn chưa đăng nhập!');
      navigate('/login');
      return {};
    }
    return { Authorization: `Bearer ${token}` };
  };

  const captureFrame = useCallback(async () => {
    if (!webcamRef.current || loading) return;
    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) return;
    const base64String = imageSrc.split(',')[1];
    try {
      setLoading(true);
      const response = await sendFaceAttendance({
        image: base64String,
        classId,
        sessionDate,
      });
      const { student_id, full_name } = response;
      if (student_id && !recognizedStudents.some(s => s.student_id === student_id)) {
        setRecognizedStudents(prev => [...prev, { student_id, full_name }]);
        message.success(`Đã điểm danh: ${full_name}`);
      }
      setSessionStatus('Đang nhận diện khuôn mặt...');
    } catch (error) {
      if (error.message === 'Unauthorized') {
        message.error('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại!');
        localStorage.removeItem('token');
        navigate('/login');
      } else if (error.response?.status === 403) {
        message.error('Bạn không có quyền thực hiện điểm danh này!');
      } else if (error.response?.status === 422) {
        message.error('Dữ liệu gửi lên không hợp lệ. Vui lòng kiểm tra:', error.response?.data?.detail);
      } else {
        message.warning('Không tìm thấy học sinh phù hợp hoặc lỗi kết nối.');
      }
    } finally {
      setLoading(false);
    }
  }, [webcamRef, loading, recognizedStudents, classId, sessionDate, navigate]);

  useEffect(() => {
    if (isCameraOpen && !intervalRef.current) {
      intervalRef.current = setInterval(captureFrame, 2000); // Kiểm tra khuôn mặt mỗi 2 giây
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isCameraOpen, captureFrame]);

  // Fetch students from API
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const data = await fetchClassStudents(classId);
        setStudentsData(data);
      } catch (error) {
        message.error('Không thể lấy danh sách học sinh.');
      }
    };
    if (classId) fetchStudents();
  }, [classId]);

  // Fetch attendance status for the session
  useEffect(() => {
    const fetchAttendanceStatus = async () => {
      try {
        const data = await fetchSessionAttendance(classId, sessionDate);
        setAttendanceData(data);
      } catch (error) {
        message.error('Không thể lấy dữ liệu điểm danh.');
      }
    };
    if (classId && sessionDate) fetchAttendanceStatus();
  }, [classId, sessionDate]);

  const handleClose = () => {
    setIsCameraOpen(false);
    setRecognizedStudents([]);
    
    // Cập nhật trạng thái điểm danh sau khi đóng modal
    if (recognizedStudents.length > 0) {
        // Cập nhật trạng thái điểm danh trong bảng điểm danh (cập nhật API hoặc dữ liệu trong state)
        const updatedAttendanceData = attendanceData.map((student) => {
            const recognizedStudent = recognizedStudents.find(
                (recognized) => recognized.student_id === student.student_id
            );
            if (recognizedStudent) {
                return { ...student, status: 'Present' }; // Cập nhật trạng thái điểm danh là "Present"
            }
            return student; // Giữ nguyên học sinh chưa được điểm danh
        });

        setAttendanceData(updatedAttendanceData); // Cập nhật lại dữ liệu điểm danh trong bảng
        message.success('Đã hoàn thành điểm danh tự động!');
    } else {
        message.info('Không có học sinh được điểm danh.');
    }
};


  const handleGoBack = () => {
    navigate(-1); // Go back to the previous page
  };

  // Combine the student list with their attendance status
  const combineStudentsWithAttendance = () => {
    return studentsData.map(student => {
      const attendance = attendanceData.find(att => att.student_id === student.id);
      return {
        ...student,
        status: attendance ? attendance.status : 'Absent',
      };
    });
  };

  const generatePublicLink = () => {
    // Đường dẫn public, có thể điều chỉnh lại domain nếu deploy
    return `${window.location.origin}/face-attendance/public?classId=${classId}&sessionDate=${sessionDate}`;
  };

  return (
    <div style={{ padding: 20 }}>
      {/* Nút quay lại lớp học */}
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={handleGoBack}
        style={{
          paddingLeft: 0,
          fontSize: 16,
          marginBottom: 16
        }}
        type='link'
      >
        Quay lại
      </Button>

      <h2>Điểm danh khuôn mặt tự động</h2>
      <Button
        type="dashed"
        onClick={() => setIsQRModalOpen(true)}
        style={{ marginBottom: 16 }}
      >
        <QrcodeOutlined />Tạo mã QR cho buổi học này
      </Button>
      <Modal
        title="Mã QR điểm danh khuôn mặt (không cần đăng nhập)"
        open={isQRModalOpen}
        onCancel={() => setIsQRModalOpen(false)}
        footer={null}
      >
        <div style={{ textAlign: 'center' }}>
          <QRCodeCanvas value={generatePublicLink()} size={256} />
          <div style={{ marginTop: 16, wordBreak: 'break-all' }}>
            <a href={generatePublicLink()} target="_blank" rel="noopener noreferrer">{generatePublicLink()}</a>
          </div>
        </div>
      </Modal>
      <Table
        columns={[
          { title: "Mã học sinh", dataIndex: "id", key: "id" },
          { title: "Họ và tên", dataIndex: "full_name", key: "full_name" },
          { title: "Email", dataIndex: "email", key: "email" },
          { title: "Số điện thoại", dataIndex: "phone_number", key: "phone_number" },
          {
            title: "Trạng thái",
            dataIndex: "status",
            key: "status",
            render: (status) => (
              <Tag
                color={status === 'Present' ? 'green' : 'red'}
                style={{
                  padding: '5px 10px',
                  borderRadius: '5px',
                  border: '1px solid',
                  borderColor: status === 'Present' ? 'green' : 'red',
                  fontWeight: 'bold',
                  color: status === 'Present' ? 'green' : 'red',
                }}
              >
                {status}
              </Tag>
            ),
          },
        ]}
        dataSource={combineStudentsWithAttendance()} // Combine student data with attendance status
        rowKey="student_id"
        pagination={false}
      />
      <Button
        type="primary"
        onClick={() => setIsCameraOpen(true)}
        disabled={loading || !classId || !sessionDate}
        style={{ marginBottom: 20, marginTop: 20 }}
      >
        Bắt đầu điểm danh khuôn mặt
      </Button>

      <Modal
        title="Điểm danh khuôn mặt tự động"
        open={isCameraOpen}
        onCancel={handleClose}
        footer={[
          <Button key="close" onClick={handleClose}>
            Đóng
          </Button>,
        ]}
        width={800}
      >
        <Webcam
          audio={false}
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          style={{ width: '100%' }}
        />
        {recognizedStudents.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <h3>Học sinh đã được điểm danh:</h3>
            <List
              bordered
              dataSource={recognizedStudents}
              renderItem={(student) => (
                <List.Item>
                  {student.full_name} (ID: {student.student_id})
                </List.Item>
              )}
            />
          </div>
        )}
        {loading && <Spin tip="Đang nhận diện..." />}
        {sessionStatus && <Divider>{sessionStatus}</Divider>}
      </Modal>
    </div>
  );
};

export default FaceAttendance;
