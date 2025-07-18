import React, { useEffect, useState } from "react";
import { Card, List, Typography, Row, Col, Tabs, Divider, Skeleton, Empty, Pagination, Button, Carousel, message } from "antd";
import usePageTitle from "../common/usePageTitle";
import { useNavigate } from "react-router-dom";
import { fetchUserInfo, fetchNews, fetchActiveBanners } from "../../api/userInfo";
import { fetchTeacherSchedule } from "../../api/teacherClasses";

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const TeacherDashboard = () => {
    usePageTitle("Teacher Dashboard");

    // State
    const [user, setUser] = useState(null);
    const [todayClasses, setTodayClasses] = useState([]);
    const [upcomingClasses, setUpcomingClasses] = useState([]);
    const [pastClasses, setPastClasses] = useState([]);
    const [news, setNews] = useState([]);
    const [banners, setBanners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(4);
    const navigate = useNavigate();

    // Fetch classes data
    const fetchClassesData = async () => {
        try {
            const data = await fetchTeacherSchedule();
            const today = [];
            const upcoming = [];
            const past = [];

            const currentDate = new Date().toISOString().split("T")[0];

            data.forEach(item => {
                if (item.date === currentDate) {
                    today.push(item);
                } else if (item.date > currentDate) {
                    upcoming.push(item);
                } else {
                    past.push(item);
                }
            });

            setTodayClasses(today);
            setUpcomingClasses(upcoming);
            setPastClasses(past);
            setLoading(false);
        } catch (error) {
            console.error("Lỗi khi tải lịch giảng dạy:", error);
            setLoading(false);
        }
    };

    useEffect(() => {
        const loadData = async () => {
            try {
                const [userData, newsData, bannersData] = await Promise.all([
                    fetchUserInfo(),
                    fetchNews(),
                    fetchActiveBanners()
                ]);
                
                setUser(userData);
                setNews(newsData);
                setBanners(bannersData);
            } catch (error) {
                if (error.message === "Unauthorized") {
                    message.error("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại!");
                    navigate("/login");
                } else {
                    message.error("Lỗi khi tải dữ liệu.");
                }
            }
        };

        loadData();
        fetchClassesData();
    }, []);

    // Hàm nhóm các lớp theo ngày
    const groupClassesByDate = (classes) => {
        return classes.reduce((acc, item) => {
            if (!acc[item.date]) {
                acc[item.date] = [];
            }
            acc[item.date].push(item);
            return acc;
        }, {});
    };

    
    const handleSessionClick = (sessionID) => {
        navigate(`/sessions/${sessionID}`);
    };

    // Render classes with group by date
    const renderClasses = (classes) => {
        const groupedClasses = groupClassesByDate(classes);
        return Object.keys(groupedClasses).map((date) => (
            <div key={date}>
                <Title level={4}>{date}</Title>
                {groupedClasses[date].length === 0 ? (
                    <Empty description="Không có lớp học" />
                ) : (
                    <Row gutter={[16, 16]}>
                        {groupedClasses[date].map((item) => (
                            <Col span={8} key={item.id}>
                                <Card
                                    title={item.class_name}
                                    bordered={false}
                                    extra={
                                        <Button
                                            type="link"
                                            onClick={() => handleSessionClick(item.session_id)} // Xử lý sự kiện click
                                        >
                                            Xem chi tiết
                                        </Button>
                                    }
                                >
                                    <Text><strong>Giảng viên:</strong> {item.teacher_name}</Text><br />
                                    <Text><strong>Môn học:</strong> {item.subject}</Text><br />
                                    <Text><strong>Số học sinh:</strong> {item.student_count}</Text><br />
                                    <Text><strong>Thời gian:</strong> {item.start_time} - {item.end_time}</Text>
                                </Card>
                            </Col>
                        ))}
                    </Row>
                )}
                <Divider />
            </div>
        ));
    };

    // Xử lý sự thay đổi trang
    const onPageChange = (page) => {
        setCurrentPage(page);
    };

    // Paginated news
    const paginatedNews = news.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    // Handle News click
    const handleNewsClick= (id) => {
        navigate(`/news/${id}`);
    };

    return (
        <div style={{ padding: 20 }}>
            <h2 style={{ fontWeight: "bold", fontSize:28 }}>Xin chào, {user ? user.full_name : "Người dùng"}</h2>
            
            {/* Banner Carousel */}
            {banners.length > 0 && (
                <Carousel 
                    autoplay={{ dotDuration: true }} 
                    style={{ marginBottom: "20px" }}
                    autoplaySpeed={10000}
                    arrows
                >
                    {banners.map((banner) => (
                        <div key={banner.id}>
                            <img
                                src={banner.image_url}
                                alt="Banner"
                                style={{width: "90%", borderRadius: "10px", objectFit: "cover", overflow: "hidden", aspectRatio:"4/1", marginLeft:"auto", marginRight:"auto"  }}
                            />
                        </div>
                    ))}
                </Carousel>
            )}

            <Row gutter={16}>
                <Col span={16}>
                    {/* Danh sách lớp dạy với các tab */}
                    <Card title="Lịch giảng dạy" style={{ marginBottom: 20 }}>
                        {loading ? (
                            <Skeleton active />
                        ) : (
                            <Tabs defaultActiveKey="1">
                                <TabPane tab="Hôm nay" key="1">
                                    {todayClasses.length === 0 ? (
                                        <Empty description="Không có lớp dạy hôm nay, thầy / cô hãy nghỉ ngơi chút nhé!" />
                                    ) : (
                                        renderClasses(todayClasses)
                                    )}
                                </TabPane>

                                <TabPane tab="Sắp tới" key="2">
                                    {upcomingClasses.length === 0 ? (
                                        <Empty description="Không có lớp dạy sắp tới" />
                                    ) : (
                                        renderClasses(upcomingClasses)
                                    )}
                                </TabPane>

                                <TabPane tab="Đã qua" key="3">
                                    {pastClasses.length === 0 ? (
                                        <Empty description="Không có lớp dạy đã qua" />
                                    ) : (
                                        renderClasses(pastClasses)
                                    )}
                                </TabPane>
                            </Tabs>
                        )}
                    </Card>
                </Col>

                <Col span={8}>
                    {/* Thống kê */}
                    <Card title="Tổng quan" style={{ marginBottom: 20 }}>
                        <Row>
                            <Col span={24}>
                                <Text strong style={{marginRight: "0.5rem"}}>Số lớp học hôm nay:</Text>
                                <Text>{todayClasses.length}</Text>
                            </Col>
                            <Divider />
                            <Col span={24}>
                                <Text strong style={{marginRight: "0.5rem"}}>Số lớp học sắp tới:</Text>
                                <Text>{upcomingClasses.length}</Text>
                            </Col>
                        </Row>
                    </Card>

                    {/* Khu vực tin tức */}
                    <Card title="Tin tức & Thông báo" style={{ marginBottom: 20 }}>
                        <List
                            dataSource={paginatedNews}
                            renderItem={(item) => (
                                <List.Item>
                                    <Row gutter={16}>
                                        <Col span={6}>
                                            <img
                                                src={item.image_url}
                                                alt={item.title}
                                                style={{ width: "100%", height: "auto", borderRadius: "8px" }}
                                            />
                                        </Col>
                                        <Col span={18}>
                                            <Text
                                                strong
                                                onClick={() => handleNewsClick(item.id)}
                                                style={{
                                                    cursor: "pointer",
                                                    textDecoration: "none",
                                                }}
                                                onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                                                onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                                            >
                                                {item.title}
                                            </Text>
                                            <p>{item.content.slice(0, 100)}...</p>
                                            <Text type="secondary">Ngày đăng: {new Date(item.created_at).toLocaleDateString()}</Text>
                                        </Col>
                                    </Row>
                                </List.Item>
                            )}
                        />
                        {/* Pagination */}
                        <Pagination
                            current={currentPage}
                            total={news.length}
                            pageSize={pageSize}
                            onChange={onPageChange}
                            style={{ marginTop: "16px", textAlign: "center" }}
                        />
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default TeacherDashboard;
