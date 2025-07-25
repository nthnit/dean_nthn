import React, { useState, useEffect } from "react";
import { Table, Select, Button, Space, message, Input } from "antd";
import { useNavigate, Link } from "react-router-dom";
import usePageTitle from "../common/usePageTitle";
import { fetchClasses, fetchTeachers, assignTeacherToClass } from "../../api/classes";

const { Option } = Select;

const AssignTeaching = () => {
    usePageTitle("Assign");
    const [classes, setClasses] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState("");
    const navigate = useNavigate();

    useEffect(() => {
        fetchClassesData();
        fetchTeachersData();
    }, []);

    // 🟢 Lấy danh sách lớp học
    const fetchClassesData = async () => {
        setLoading(true);
        try {
            const data = await fetchClasses();
            setClasses(data);
        } catch (error) {
            if (error.message === "Unauthorized") {
                message.error("Bạn chưa đăng nhập!");
                navigate("/login");
            } else {
                message.error("Lỗi khi tải danh sách lớp học.");
            }
        }
        setLoading(false);
    };

    // 🟢 Lấy danh sách giảng viên
    const fetchTeachersData = async () => {
        try {
            const data = await fetchTeachers();
            setTeachers(data);
        } catch (error) {
            if (error.message === "Unauthorized") {
                message.error("Bạn chưa đăng nhập!");
                navigate("/login");
            } else {
                message.error("Lỗi khi tải danh sách giảng viên.");
            }
        }
    };

    // 🟢 Lấy tên giảng viên dựa trên `teacher_id`
    const getTeacherName = (teacherId) => {
        const teacher = teachers.find((t) => t.id === teacherId);
        return teacher ? teacher.full_name : "Chưa phân công";
    };

    // 🟢 Cập nhật `teacher_id` khi chọn giảng viên
    const handleTeacherChange = (classId, teacherId) => {
        setClasses((prevClasses) =>
            prevClasses.map((cls) =>
                cls.id === classId ? { ...cls, teacher_id: teacherId } : cls
            )
        );
    };

    // 🟢 Gửi API để cập nhật giảng viên cho lớp
    const handleAssign = async (classId, teacherId) => {
        try {
            await assignTeacherToClass(classId, teacherId);
            message.success("Phân công giảng viên thành công!");
            fetchClassesData(); // ✅ Cập nhật lại danh sách sau khi lưu
        } catch (error) {
            if (error.message === "Unauthorized") {
                message.error("Bạn chưa đăng nhập!");
                navigate("/login");
            } else {
                message.error("Lỗi khi phân công giảng viên.");
            }
        }
    };

    // 🟢 Xử lý tìm kiếm lớp học
    const handleSearch = (e) => {
        setSearchText(e.target.value.toLowerCase());
    };

    // 🟢 Lọc lớp học dựa trên tìm kiếm
    const filteredClasses = classes.filter(
        (cls) =>
            cls.name.toLowerCase().includes(searchText) ||
            cls.class_code.toLowerCase().includes(searchText)
    );

    // 🟢 Cột của bảng
    const columns = [
        {
            title: "Mã lớp",
            dataIndex: "class_code",
            key: "class_code",
            render: (text, record) => <Link to={`/manager/classes/${record.id}`}>{text}</Link>,
        },
        {
            title: "Tên lớp",
            dataIndex: "name",
            key: "name",
        },
        {
            title: "Giảng viên",
            dataIndex: "teacher_id",
            key: "teacher_id",
            render: (_, record) => (
                <Select
                    value={record.teacher_id || null}
                    style={{ width: 200 }}
                    onChange={(value) => handleTeacherChange(record.id, value)}
                >
                    <Option value={null}>Chưa phân công</Option>
                    {teachers.map((teacher) => (
                        <Option key={teacher.id} value={teacher.id}>
                            {teacher.full_name}
                        </Option>
                    ))}
                </Select>
            ),
        },
        {
            title: "Tên giảng viên",
            key: "teacher_name",
            render: (_, record) => <span>{getTeacherName(record.teacher_id)}</span>,
        },
        {
            title: "Hành động",
            key: "action",
            render: (_, record) => (
                <Button
                    type="primary"
                    onClick={() => handleAssign(record.id, record.teacher_id)}
                    disabled={!record.teacher_id}
                >
                    Lưu
                </Button>
            ),
        },
    ];

    return (
        <div style={{ padding: 20 }}>
            <h2>Phân công Giảng viên</h2>
            <Space style={{ marginBottom: 16 }}>
                <Input
                    placeholder="Tìm kiếm lớp học..."
                    onChange={handleSearch}
                    allowClear
                />
            </Space>
            <Table
                columns={columns}
                dataSource={filteredClasses}
                loading={loading}
                rowKey="id"
            />
        </div>
    );
};

export default AssignTeaching;
